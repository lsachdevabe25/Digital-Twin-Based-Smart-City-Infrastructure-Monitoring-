import json
from pathlib import Path

from twin.pro import RampurTwinPro
from twin.storage import Storage

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "rampur_data.json"


def make_twin():
    raw = json.loads(DATA_FILE.read_text())
    runs_under = raw.pop("runs_under")
    depends_on = raw.pop("depends_on")
    return RampurTwinPro(raw, runs_under, depends_on)


def test_readings_are_saved_and_listed(tmp_path):
    store = Storage(tmp_path / "t.db")
    twin = make_twin()
    for v in (2.4, 0.5):
        twin.update_state({"asset_id": "PIPE-RMP-0004", "metric": "pressure_bar", "value": v})
        store.save(twin.clock, "PIPE-RMP-0004", "pressure_bar", v)
        twin.tick()
    assert store.count() == 2
    assert store.recent("PIPE-RMP-0004", limit=1)[0]["value"] == 0.5     # newest first


def test_restart_restores_status_and_alerts(tmp_path):
    db = tmp_path / "t.db"
    store = Storage(db)
    live = make_twin()
    for _ in range(3):                                   # three low readings = leak
        live.update_state({"asset_id": "PIPE-RMP-0004", "metric": "pressure_bar", "value": 0.5})
        store.save(live.clock, "PIPE-RMP-0004", "pressure_bar", 0.5)
        live.tick()

    # "restart": brand-new twin, new connection to the same file
    restored = Storage(db).replay_into(make_twin())
    assert restored.pipes["PIPE-RMP-0004"]["status"] == "leak suspected"
    assert len(restored.alerts) == 1
    assert restored.alerts[0]["pipe"] == "PIPE-RMP-0004"
