import json
from pathlib import Path

from twin.pro import RampurTwinPro

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "rampur_data.json"


def make_twin():
    """Build a fresh twin for every test, so tests never affect each other."""
    raw = json.loads(DATA_FILE.read_text())
    runs_under = raw.pop("runs_under")
    depends_on = raw.pop("depends_on")
    return RampurTwinPro(raw, runs_under, depends_on)


def pressure(pipe_id, value):
    return {"asset_id": pipe_id, "metric": "pressure_bar", "value": value}


# ---------- input validation ----------
def test_bad_messages_are_rejected_and_logged():
    t = make_twin()
    assert t.update_state(pressure("PIPE-XXX-9999", 2.0)) is None       # unknown id
    assert t.update_state(pressure("PIPE-RMP-0001", "high")) is None    # not a number
    assert t.update_state({"asset_id": "PIPE-RMP-0001"}) is None        # missing fields
    assert len(t.bad_messages) == 3


def test_good_message_updates_pressure():
    t = make_twin()
    pipe = t.update_state(pressure("PIPE-RMP-0001", 2.4))
    assert pipe["pressure_bar"] == 2.4
    assert pipe["status"] == "operational"


# ---------- leak detection ----------
def test_one_low_reading_is_only_a_watch():
    t = make_twin()
    pipe = t.update_state(pressure("PIPE-RMP-0004", 0.5))
    assert pipe["status"] == "watch"
    assert len(t.alerts) == 0


def test_three_low_readings_raise_a_leak_alert():
    t = make_twin()
    for _ in range(3):
        pipe = t.update_state(pressure("PIPE-RMP-0004", 0.5))
    assert pipe["status"] == "leak suspected"
    assert len(t.alerts) == 1
    assert t.alerts[0]["pipe"] == "PIPE-RMP-0004"


# ---------- impact and backup routes ----------
def test_backup_pipe_removes_impact_on_hospital():
    t = make_twin()
    assert t.has_alternate_route("PIPE-RMP-0003") is True
    assert t.criticality("PIPE-RMP-0003") == 0


def test_main_pipe_is_more_critical_than_school_pipe():
    t = make_twin()
    assert t.criticality("PIPE-RMP-0001") > t.criticality("PIPE-RMP-0004")


# ---------- repair plan ----------
def test_repair_plan_is_sorted_by_risk_and_complete():
    t = make_twin()
    plan = t.repair_plan()
    assert len(plan) == 12
    risks = [row["risk"] for row in plan]
    assert risks == sorted(risks, reverse=True)
    assert plan[0]["pipe"] == "PIPE-RMP-0001"


# ---------- power failure ----------
def test_transformer_failure_and_restore():
    t = make_twin()
    t.fail_transformer("TR-RMP-0001")
    assert any(p["status"] == "no flow (power)" for p in t.pipes.values())
    t.restore_transformer("TR-RMP-0001")
    assert not any(p["status"] == "no flow (power)" for p in t.pipes.values())
