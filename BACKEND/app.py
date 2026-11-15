import copy
import math

import networkx as nx 
import json
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from twin.pro import RampurTwinPro

DATA_FILE = Path(__file__).resolve().parent / "data" / "rampur_data.json"
RISK_THRESHOLD = 0.5   # risk at or above this means "schedule repair"


def build_twin():
    raw = json.loads(DATA_FILE.read_text())
    runs_under = raw.pop("runs_under")
    depends_on = raw.pop("depends_on")
    return RampurTwinPro(raw, runs_under, depends_on)


app = FastAPI(title="Rampur Digital Twin API")
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
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

# ================= NEW: network, analyze, power-failure =================
# ===== analyze + power-failure (self-contained) =====
import copy
import math

import networkx as nx

_RAW = json.loads(DATA_FILE.read_text())
_ROADS = {r["id"]: r for r in _RAW["roads"]}
_TRANSFORMERS = _RAW["power"]


def _road_info(pipe_id):
    r = _ROADS.get(twin.runs_under.get(pipe_id))
    return {"name": r["name"], "condition": r["condition"]} if r else None


def _transformer_cascade(tid):
    g = twin.graph
    assets = [a for a, t in twin.depends_on.items() if t == tid]
    reservoirs = [n for n, d in g.nodes(data=True) if d["type"] == "reservoir"]

    def supplied(res_list):
        s = set()
        for r in res_list:
            s |= nx.descendants(g, r) | {r}
        return s

    failed = [a for a in assets if a in reservoirs]
    lost = supplied(reservoirs) - supplied([r for r in reservoirs if r not in failed])
    return {
        "transformer": tid,
        "power_loss": [twin.name(a) for a in assets],
        "water_cascade": sorted(twin.name(n) for n in lost),
        "backup_note": ("Some areas stay supplied by another reservoir."
                        if failed and len(failed) < len(reservoirs) else ""),
    }


class AnalyzeBody(BaseModel):
    pipe_id: str
    pressure_bar: float


@app.post("/analyze")
def analyze_pipe_endpoint(req: AnalyzeBody):
    """DRY RUN: works on a copy, never changes the live twin."""
    check_pipe(req.pipe_id)
    v = req.pressure_bar
    if not math.isfinite(v) or v < 0 or v > 10:
        raise HTTPException(status_code=422, detail="pressure_bar must be between 0 and 10")

    sim = copy.deepcopy(twin)
    pipe = sim.update_state({"asset_id": req.pipe_id, "metric": "pressure_bar", "value": v})
    status = pipe["status"]

    health = sim.health_score(req.pipe_id)
    crit = sim.criticality(req.pipe_id)
    risk = sim.risk(req.pipe_id)

    if status == "leak suspected":
        reason = f"{v} bar is below the {twin.LEAK_THRESHOLD} bar leak threshold."
    elif status == "watch":
        reason = f"{v} bar is low and falling toward the {twin.LEAK_THRESHOLD} bar threshold."
    else:
        reason = f"{v} bar is at or above the {twin.LEAK_THRESHOLD} bar threshold."

    road = _road_info(req.pipe_id)
    road_note = ""
    if road and road["condition"] < 0.7:
        road_note = f"{road['name']} is in poor condition ({road['condition']}); repair it at the same time."

    if status == "leak suspected":
        action, why = "repair now", "Leak suspected."
    elif risk >= RISK_THRESHOLD:
        action, why = "schedule repair", f"High risk ({risk})."
    else:
        action, why = "no repair needed", "Pipe is healthy and low risk."

    impacted = set(sim.impact(req.pipe_id))
    power = []
    for t in _TRANSFORMERS:
        c = _transformer_cascade(t["id"])
        if impacted & set(c["water_cascade"]) or impacted & set(c["power_loss"]):
            power.append(c)

    return {
        "pipe": req.pipe_id, "pressure_bar": v, "status": status, "reason": reason,
        "health_score": health, "failure_chance": round(1 - health, 2),
        "criticality": crit, "risk": risk,
        "impact": sim.impact(req.pipe_id),
        "has_backup": sim.has_alternate_route(req.pipe_id),
        "road_impact": road,
        "power_failure_impact": power,
        "advice": {"action": action, "reason": why, "road_note": road_note},
        "repair_plan": sim.repair_plan(),
    }


@app.get("/power-failure/{transformer_id}")
def power_failure_endpoint(transformer_id: str):
    if transformer_id not in {t["id"] for t in _TRANSFORMERS}:
        raise HTTPException(status_code=404, detail=f"unknown transformer {transformer_id!r}")
    return _transformer_cascade(transformer_id)
# ===== /network (clean version) =====
_COORDS = {
    "RES-RMP-0001": (5, 50),  "J-RMP-0001": (22, 50), "J-RMP-0002": (40, 85),
    "HOS-RMP-0001": (62, 75), "SCH-RMP-0001": (40, 62), "J-RMP-0003": (40, 35),
    "J-RMP-0004": (62, 22),   "J-RMP-0005": (62, 42),  "J-RMP-0006": (82, 30),
    "SCH-RMP-0002": (84, 10), "HOS-RMP-0002": (82, 55), "RES-RMP-0002": (40, 8),
}


@app.get("/network")
def network_endpoint():
    nodes = [{"id": n["id"], "name": n["name"], "type": n["type"],
              "x": _COORDS[n["id"]][0], "y": _COORDS[n["id"]][1]}
             for n in _RAW["nodes"]]
    pipes = []
    for pid, p in twin.pipes.items():
        r = _road_info(pid)
        pipes.append({"id": pid, "from": p["from"], "to": p["to"],
                      "material": p["material"], "install_year": p["install_year"],
                      "pressure_bar": p["pressure_bar"], "status": p["status"],
                      "road": r["name"] if r else None})
    transformers = [{**t, "assets": [a for a, tt in twin.depends_on.items() if tt == t["id"]]}
                    for t in _TRANSFORMERS]
    return {"nodes": nodes, "pipes": pipes, "transformers": transformers,
            "depends_on": twin.depends_on}