import json
import math
from pathlib import Path
from datetime import datetime
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from twin.pro import RampurTwinPro

DATA_FILE = Path(__file__).resolve().parent / "data" / "rampur_data.json"


def build_twin():
    raw = json.loads(DATA_FILE.read_text())
    runs_under = raw.pop("runs_under")
    depends_on = raw.pop("depends_on")
    return RampurTwinPro(raw, runs_under, depends_on)


app = FastAPI(title="Rampur Digital Twin API")
print(f"APP FILE: {__file__}")

# Allow any Vite dev server port (5173‑5180) and future dynamic ports.
# Using a regex origin check as requested.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

twin = build_twin()          # one live twin, shared by all requests
# ---------- PERSISTENT STORAGE ----------

STATE_FILE = Path(__file__).resolve().parent / "data" / "runtime_state.json"


def save_state():
    state = {
        "history": twin.history,
        "alerts": twin.alerts,
        "pipes": twin.pipes,
        "clock": twin.clock.isoformat()
    }

    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=4, default=lambda obj: obj.isoformat()
                  if isinstance(obj, datetime) else str(obj))


def load_state():
    if not STATE_FILE.exists():
        return

    with open(STATE_FILE, "r") as f:
        state = json.load(f)

    twin.history = state.get("history", [])
    twin.alerts = state.get("alerts", [])

    # Convert saved timestamps back into datetime objects
    for record in twin.history + twin.alerts:
        if isinstance(record.get("time"), str):
            record["time"] = datetime.fromisoformat(record["time"])

    # Restore previous pipe information
    saved_pipes = state.get("pipes", {})

    for pid, saved_pipe in saved_pipes.items():
        if pid in twin.pipes:
            twin.pipes[pid].update(saved_pipe)

    # Restore simulated clock
    saved_clock = state.get("clock")

    if saved_clock:
        twin.clock = datetime.fromisoformat(saved_clock)


# Load saved information when the API starts
load_state()


# ---------- request bodies ----------
class SensorReading(BaseModel):
    asset_id: str
    metric: str = "pressure_bar"
    value: Any


class AnalyzeRequest(BaseModel):
    pipe_id: str
    pressure_bar: Any


class WhatIf(BaseModel):
    pipe_ids: list[str]


def check_pipe(pipe_id: str):
    if pipe_id not in twin.pipes:
        raise HTTPException(status_code=404, detail=f"unknown pipe {pipe_id!r}")


# ---------- endpoints ----------
@app.get("/")
def home():
    return {"service": "Rampur Digital Twin", "pipes": len(twin.pipes), "docs": "/docs"}


@app.get("/network")
def get_network():
    nodes = list(twin.data.get("nodes", []))
    pipes = []
    for pid, p in twin.pipes.items():
        rid = twin.runs_under.get(pid)
        road_name = twin.roads.get(rid, {}).get("name") if rid else None
        pipes.append({
            "id": p["id"],
            "from": p["from"],
            "to": p["to"],
            "material": p["material"],
            "install_year": p["install_year"],
            "pressure_bar": p["pressure_bar"],
            "status": p["status"],
            "road": road_name
        })
    transformers = list(twin.transformers.values())
    return {
        "nodes": nodes,
        "pipes": pipes,
        "transformers": transformers,
        "depends_on": twin.depends_on
    }


@app.post("/analyze")
def post_analyze(req: AnalyzeRequest):
    if req.pipe_id not in twin.pipes:
        raise HTTPException(status_code=422, detail=f"unknown pipe {req.pipe_id!r}")

    if isinstance(req.pressure_bar, bool) or not isinstance(req.pressure_bar, (int, float)):
        raise HTTPException(status_code=422, detail="pressure_bar must be a finite number and cannot be a boolean")

    val = float(req.pressure_bar)
    if math.isnan(val) or math.isinf(val):
        raise HTTPException(status_code=422, detail="pressure_bar must be a finite number")

    if not (0 <= val <= 10):
        raise HTTPException(status_code=422, detail=f"pressure_bar must be between 0 and 10, got {val}")

    res = twin.analyze_pipe(req.pipe_id, val)
    return res


@app.post("/sensor")
def post_sensor(reading: SensorReading):
    if reading.asset_id not in twin.pipes:
        raise HTTPException(
            status_code=404,
            detail=f"unknown asset_id {reading.asset_id!r}"
        )

    if isinstance(reading.value, bool) or not isinstance(reading.value, (int, float)):
        raise HTTPException(status_code=422, detail="value must be a finite number and cannot be a boolean")

    val = float(reading.value)
    if math.isnan(val) or math.isinf(val):
        raise HTTPException(status_code=422, detail="value must be a finite number")

    if not (0 <= val <= 10):
        raise HTTPException(status_code=422, detail=f"value must be between 0 and 10, got {val}")

    reading_dict = {
        "asset_id": reading.asset_id,
        "metric": reading.metric,
        "value": val
    }

    pipe = twin.update_state(reading_dict)

    if pipe is None:
        raise HTTPException(
            status_code=404,
            detail=f"unknown asset_id {reading.asset_id!r}"
        )

    twin.tick()

    # Save updated information permanently
    save_state()

    return {
        "asset_id": reading.asset_id,
        "status": pipe["status"],
        "pressure_bar": pipe["pressure_bar"]
    }


@app.get("/power-failure/{transformer_id}")
def get_power_failure(transformer_id: str):
    if transformer_id not in twin.transformers:
        raise HTTPException(status_code=404, detail=f"unknown transformer {transformer_id!r}")
    cascade = twin.get_transformer_cascade(transformer_id)
    return cascade


@app.get("/status")
def get_status():
    return {pid: {"status": p["status"], "pressure_bar": p["pressure_bar"]}
            for pid, p in twin.pipes.items()}


@app.get("/alerts")
def get_alerts():
    return twin.alerts


@app.get("/history")
def get_history():
    return sorted(
        twin.history,
        key=lambda x: x["time"],
        reverse=True
    )


@app.get("/repair-plan")
def get_repair_plan():
    return twin.repair_plan()


@app.get("/impact/{pipe_id}")
def get_impact(pipe_id: str):
    check_pipe(pipe_id)
    return {"pipe": pipe_id,
            "affected": twin.impact(pipe_id),
            "severity": twin.criticality(pipe_id),
            "has_backup": twin.has_alternate_route(pipe_id),
            "road": twin.road_impact(pipe_id)}


@app.post("/what-if")
def what_if(scenario: WhatIf):
    """Simulate pipes failing WITHOUT changing the live state."""
    for pid in scenario.pipe_ids:
        check_pipe(pid)
    return {"failed_pipes": scenario.pipe_ids,
            "affected": twin.impact(scenario.pipe_ids),
            "severity": twin.criticality(scenario.pipe_ids)}


@app.get("/bad-messages")
def get_bad_messages():
    return twin.bad_messages
