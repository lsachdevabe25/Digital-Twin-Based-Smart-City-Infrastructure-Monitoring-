import json
from twin.pro import RampurTwinPro

raw = json.load(open("data/rampur_data.json"))
runs_under = raw.pop("runs_under")
depends_on = raw.pop("depends_on")

t = RampurTwinPro(raw, runs_under, depends_on)
t.update_state({"asset_id": "PIPE-XXX-9999", "metric": "pressure_bar", "value": 2.0})
print(len(t.bad_messages), "bad message caught")
t.print_repair_plan()