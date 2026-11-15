import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from twin.pro import RampurTwinPro

DATA_FILE = Path(__file__).resolve().parent / "data" / "rampur_data.json"


def build_twin():
    raw = json.loads(DATA_FILE.read_text())
    runs_under = raw.pop("runs_under")
    depends_on = raw.pop("depends_on")
    return RampurTwinPro(raw, runs_under, depends_on)


app = FastAPI(title="Rampur Digital Twin API")
twin = build_twin()          # one live twin, shared by all requests


# ---------- request bodies ----------
class SensorReading(BaseModel):
    asset_id: str
    metric: str = "pressure_bar"
    value: float


class WhatIf(BaseModel):
    pipe_ids: list[str]


def check_pipe(pipe_id: str):
    if pipe_id not in twin.pipes:
        raise HTTPException(status_code=404, detail=f"unknown pipe {pipe_id!r}")


# ---------- endpoints ----------
@app.get("/")
def home():
    return {"service": "Rampur Digital Twin", "pipes": len(twin.pipes), "docs": "/docs"}


@app.post("/sensor")
def post_sensor(reading: SensorReading):
    pipe = twin.update_state(reading.model_dump())
    if pipe is None:
        raise HTTPException(status_code=404, detail=f"unknown asset_id {reading.asset_id!r}")
    twin.tick()                                   # advance the simulated clock
    return {"asset_id": reading.asset_id, "status": pipe["status"],
            "pressure_bar": pipe["pressure_bar"]}


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
