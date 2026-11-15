import random
from collections import deque
from datetime import date

import networkx as nx

random.seed(42)   # same simulation output every run


class RampurTwin:
    # --- settings you can tune ---
    LEAK_THRESHOLD = 1.0      # bar: a reading below this is "low"
    RISK_THRESHOLD = 0.5      # threshold for scheduled repairs
    CONSECUTIVE_LOW = 3       # this many low readings in a row = leak
    WINDOW = 5                # how many recent readings we keep per pipe
    AVG_ALERT = 1.5           # average of the window below this = leak
    NORMAL_MIN = 2.0          # normal working pressure starts here
    WEIGHTS = {"hospital": 10, "school": 5, "junction": 1, "reservoir": 1}

    def __init__(self, data, runs_under, depends_on):
        self.data = data
        self.graph = nx.DiGraph()
        self.pipes = {p["id"]: dict(p) for p in data["pipes"]}      # twin's own copy
        self.roads = {r["id"]: r for r in data.get("roads", [])}
        self.transformers = {t["id"]: t for t in data.get("power", [])}
        self.runs_under = runs_under
        self.depends_on = depends_on

        for n in data["nodes"]:
            self.graph.add_node(n["id"], **n)
        for p in data["pipes"]:
            self.graph.add_edge(p["from"], p["to"], pipe_id=p["id"])

        # last few readings per pipe (seeded with the pressure in the data)
        self.readings = {pid: deque([p["pressure_bar"]], maxlen=self.WINDOW)
                         for pid, p in self.pipes.items()}
        # problems on each node, e.g. {"no power", "no water"}
        self.node_issues = {n: set() for n in self.graph.nodes}
        self.bad_messages = []          # log of rejected messages

    # ---------- helpers ----------
    def name(self, node_id):
        return self.graph.nodes[node_id]["name"]

    # =====================================================================
    # FIX 2: alert only on repeated low readings (or a low average)
    # =====================================================================
    def _reject(self, msg, reason):
        self.bad_messages.append({"msg": msg, "reason": reason})
        print(f"[ignored] {reason}: {msg}")
        return None
    def update_state(self, msg):
        if not isinstance(msg, dict):
            return self._reject(msg, "message is not a dict")

        pid = msg.get("asset_id")
        if pid not in self.pipes:
            return self._reject(msg, f"unknown asset_id {pid!r}")

        if "metric" not in msg or "value" not in msg:
            return self._reject(msg, "missing 'metric' or 'value'")

        if isinstance(msg["value"], bool) or not isinstance(msg["value"], (int, float)):
            return self._reject(msg, "value is not a number")

        pipe = self.pipes[pid]
       

        if msg["metric"] != "pressure_bar":
            pipe[msg["metric"]] = msg["value"]
            return pipe

        value = msg["value"]
        pipe["pressure_bar"] = value
        hist = self.readings[pid]
        hist.append(value)

        last = list(hist)[-self.CONSECUTIVE_LOW:]
        consecutive_low = (len(last) == self.CONSECUTIVE_LOW and
                           all(v < self.LEAK_THRESHOLD for v in last))
        average_low = (len(hist) == self.WINDOW and
                       sum(hist) / len(hist) < self.AVG_ALERT)

        if consecutive_low or average_low:
            pipe["status"] = "leak suspected"
        elif value < self.LEAK_THRESHOLD:
            pipe["status"] = "watch"            # one low reading: keep an eye, no alert
        else:
            pipe["status"] = "operational"

        self._refresh_power_status()
        return pipe

    @staticmethod
    def make_message(pipe_id, leaking=False, spike_chance=0.1):
        if leaking:                                   # a real leak stays low
            value = round(random.uniform(0.3, 0.9), 2)
        elif random.random() < spike_chance:          # one-off sensor glitch
            value = round(random.uniform(0.3, 0.9), 2)
        else:
            value = round(random.uniform(2.0, 2.6), 2)
        return {"asset_id": pipe_id, "metric": "pressure_bar", "value": value}

    def simulate(self, rounds=8, leak_pipe=None, leak_from=3):
        """Random sensors. Optionally one pipe develops a real leak from round `leak_from`."""
        for r in range(rounds):
            for pid in self.pipes:
                leaking = (pid == leak_pipe and r >= leak_from)
                before = self.pipes[pid]["status"]
                pipe = self.update_state(self.make_message(pid, leaking))
                if pipe["status"] == "leak suspected" and before != "leak suspected":
                    print(f"Round {r}: ALERT {pid} | affected: {self.impact(pid)} "
                          f"| severity: {self.criticality(pid)} | road: {self.road_impact(pid)}")
                elif pipe["status"] == "watch":
                    print(f"Round {r}: watch {pid} (single low reading, no alert)")

    # =====================================================================
    # FIX 1 + FIX 6: weighted impact, with backup routes (nx.has_path)
    # =====================================================================
    def _sources(self, g):
        return [n for n, d in g.nodes(data=True) if d.get("type") == "reservoir"]

    def _is_supplied(self, g, node):
        return any(nx.has_path(g, s, node) for s in self._sources(g))

    def affected_nodes(self, failed):
        """Nodes that lose water if the given pipe(s) fail, after considering backup routes."""
        if isinstance(failed, str):
            failed = [failed]
        g = self.graph.copy()
        for pid in failed:
            g.remove_edge(self.pipes[pid]["from"], self.pipes[pid]["to"])
        return [n for n in self.graph.nodes
                if self._is_supplied(self.graph, n) and not self._is_supplied(g, n)]

    def impact(self, failed):
        return [self.name(n) for n in self.affected_nodes(failed)]

    def criticality(self, failed):
        """Weighted sum: hospital 10, school 5, junction 1."""
        return sum(self.WEIGHTS.get(self.graph.nodes[n]["type"], 1)
                   for n in self.affected_nodes(failed))

    def has_alternate_route(self, pipe_id):
        g = self.graph.copy()
        p = self.pipes[pipe_id]
        g.remove_edge(p["from"], p["to"])
        return self._is_supplied(g, p["to"])

    def road_impact(self, pipe_id):
        rid = self.runs_under.get(pipe_id)
        return self.roads[rid]["name"] if rid in self.roads else None

    # =====================================================================
    # FIX 4: health score uses live pressure too
    # =====================================================================
    def health_score(self, pipe_id, current_year=None, simulated_pressure=None):
        pipe = self.pipes[pipe_id]
        if current_year is None:
            current_year = date.today().year
        age = current_year - pipe["install_year"]
        score = 1.0 - age * 0.01
        if pipe["material"] == "cast iron":
            score -= 0.15

        if simulated_pressure is not None:
            avg_pressure = simulated_pressure
        else:
            hist = self.readings[pipe_id]
            avg_pressure = sum(hist) / len(hist) if hist else pipe["pressure_bar"]
        penalty = max(0, (self.NORMAL_MIN - avg_pressure) / self.NORMAL_MIN) * 0.5
        score -= penalty
        return round(max(score, 0), 2)

    def criticality_label_and_weight(self, pipe_id):
        raw = self.criticality(pipe_id)
        affected = self.affected_nodes(pipe_id)
        types = [self.graph.nodes[n]["type"] for n in affected]
        if "hospital" in types or raw >= 10:
            return "HIGH", 1.0
        elif "school" in types or raw >= 5:
            return "MEDIUM", 0.6
        elif raw > 0:
            return "LOW", 0.3
        else:
            return "LOW", 0.0

    def risk(self, pipe_id, current_year=None, simulated_pressure=None):
        h = self.health_score(pipe_id, current_year=current_year, simulated_pressure=simulated_pressure)
        _, weight = self.criticality_label_and_weight(pipe_id)
        return round((1 - h) * weight, 2)

    # =====================================================================
    # FIX 5: transformer failure updates the twin
    # =====================================================================
    def fail_transformer(self, tid):
        self.transformers[tid]["status"] = "failed"
        for asset, t in self.depends_on.items():
            if t != tid:
                continue
            if self.graph.nodes[asset]["type"] == "reservoir":
                self.node_issues[asset].add(f"{tid}: pump off")
                for d in nx.descendants(self.graph, asset):
                    self.node_issues[d].add(f"{tid}: no water")
            else:
                self.node_issues[asset].add(f"{tid}: no power")
        self._refresh_power_status()
        return self.nodes_with_issues()

    def restore_transformer(self, tid):
        self.transformers[tid]["status"] = "operational"
        for n in self.node_issues:
            self.node_issues[n] = {i for i in self.node_issues[n] if not i.startswith(f"{tid}:")}
        self._refresh_power_status()

    def _refresh_power_status(self):
        for pipe in self.pipes.values():
            issues = self.node_issues[pipe["from"]]
            stopped = any("pump off" in i or "no water" in i for i in issues)
            if stopped and pipe["status"] != "leak suspected":
                pipe["status"] = "no flow (power)"
            elif not stopped and pipe["status"] == "no flow (power)":
                pipe["status"] = "operational"

    def nodes_with_issues(self):
        return {self.name(n): sorted(i) for n, i in self.node_issues.items() if i}

    # =====================================================================
    # FIX 3: advice never crashes if road data is missing
    # =====================================================================
    def structured_advice(self, pipe_id, simulated_pressure=None, current_year=None):
        if simulated_pressure is not None:
            is_leak = simulated_pressure < self.LEAK_THRESHOLD
        else:
            is_leak = self.pipes[pipe_id]["status"] == "leak suspected"

        crit_label, _ = self.criticality_label_and_weight(pipe_id)
        calc_risk = self.risk(pipe_id, current_year=current_year, simulated_pressure=simulated_pressure)

        if is_leak:
            if crit_label == "HIGH":
                action = "REPLACE IMMEDIATELY"
                reason = f"Critical pipe with suspected leak (pressure < {self.LEAK_THRESHOLD:.1f} bar) impacting high-priority nodes. Immediate replacement required."
            else:
                action = "INSPECT TODAY"
                reason = f"Pressure is below {self.LEAK_THRESHOLD:.1f} bar indicating a suspected leak. Inspection team should verify today."
        elif calc_risk >= self.RISK_THRESHOLD:
            action = "SCHEDULE MAINTENANCE"
            reason = f"Operational but calculated risk ({calc_risk:.2f}) meets or exceeds the {self.RISK_THRESHOLD:.2f} maintenance threshold."
        else:
            action = "MONITOR"
            reason = f"Nominal pressure and low risk profile ({calc_risk:.2f}). Continue routine telemetry monitoring."

        rid = self.runs_under.get(pipe_id)
        road = self.roads.get(rid) if rid else None
        road_note = None
        if road and road.get("condition", 1.0) < 0.7:
            road_note = f"{road['name']} condition is {road['condition']:.2f} (< 0.70) - coordinate trenching with municipal road repair."

        return {
            "action": action,
            "reason": reason,
            "road_note": road_note
        }

    def advice(self, pipe_id):
        return self.structured_advice(pipe_id)["action"]

    def get_transformer_cascade(self, tid):
        """Returns power loss assets and downstream water areas for a transformer."""
        if tid not in self.transformers:
            return None

        assets_on_t = [a for a, t in self.depends_on.items() if t == tid]
        direct_power_loss = []
        downstream_water_cut = set()

        for asset in assets_on_t:
            node_type = self.graph.nodes[asset].get("type", "")
            if node_type == "reservoir":
                downstream_water_cut.add(self.name(asset))
                for d in nx.descendants(self.graph, asset):
                    downstream_water_cut.add(self.name(d))
            else:
                direct_power_loss.append(self.name(asset))

        return {
            "transformer_id": tid,
            "transformer_name": self.transformers[tid].get("name", tid),
            "power_loss": sorted(direct_power_loss),
            "water_cascade": sorted(downstream_water_cut)
        }

    def get_power_dependencies_for_pipe(self, pipe_id):
        """Returns transformers on which this pipe's water supply depends."""
        if pipe_id not in self.pipes:
            return []

        pipe = self.pipes[pipe_id]
        from_node = pipe["from"]
        to_node = pipe["to"]
        dependent_transformers = []

        for tid in self.transformers:
            cascade_info = self.get_transformer_cascade(tid)
            if not cascade_info:
                continue

            # Check if this pipe's endpoints lose water when tid fails
            affected_ids = set()
            for asset, t in self.depends_on.items():
                if t == tid and self.graph.nodes[asset].get("type") == "reservoir":
                    affected_ids.add(asset)
                    affected_ids.update(nx.descendants(self.graph, asset))

            if from_node in affected_ids or to_node in affected_ids:
                dependent_transformers.append({
                    "transformer_id": tid,
                    "transformer_name": cascade_info["transformer_name"],
                    "assets_losing_power": cascade_info["power_loss"],
                    "downstream_water_impact": cascade_info["water_cascade"]
                })

        return dependent_transformers

    def analyze_pipe(self, pipe_id, pressure_bar, current_year=None):
        """Simulates pipe pressure dry-run without altering live state."""
        if pipe_id not in self.pipes:
            return None

        is_leak = pressure_bar < self.LEAK_THRESHOLD
        status = "leak suspected" if is_leak else "operational"
        reason = (
            f"Pressure ({pressure_bar:.2f} bar) is below the critical {self.LEAK_THRESHOLD:.1f} bar leak threshold."
            if is_leak else
            f"Pressure ({pressure_bar:.2f} bar) is within normal operating range."
        )

        h_score = self.health_score(pipe_id, current_year=current_year, simulated_pressure=pressure_bar)
        fail_chance = round(1.0 - h_score, 2)
        crit_label, crit_weight = self.criticality_label_and_weight(pipe_id)
        calc_risk = round(fail_chance * crit_weight, 2)
        affected_areas = self.impact(pipe_id)
        road_impact = self.road_impact(pipe_id)

        power_dependencies = self.get_power_dependencies_for_pipe(pipe_id)
        if power_dependencies:
            dep = power_dependencies[0]
            power_failure_impact = {
                "transformer_id": dep["transformer_id"],
                "affected_assets": dep["assets_losing_power"],
                "note": f"Supply depends on {dep['transformer_name']}. Transformer outage cascades water cut to: {', '.join(dep['downstream_water_impact'])}."
            }
        else:
            power_failure_impact = None

        adv = self.structured_advice(pipe_id, simulated_pressure=pressure_bar, current_year=current_year)

        # Build hypothetical repair plan with simulated pipe
        cur_year = current_year if current_year is not None else date.today().year
        plan_rows = []
        for pid in self.pipes:
            p = self.pipes[pid]
            p_age = cur_year - p["install_year"]
            if pid == pipe_id:
                p_risk = calc_risk
                p_health = h_score
                p_fail = fail_chance
                p_crit = crit_label
                p_adv = adv["action"]
                p_press = pressure_bar
                p_stat = status
                is_sim = True
            else:
                p_risk = self.risk(pid, current_year=current_year)
                p_health = self.health_score(pid, current_year=current_year)
                p_fail = round(1.0 - p_health, 2)
                p_crit = self.criticality_label_and_weight(pid)[0]
                p_adv = self.structured_advice(pid, current_year=current_year)["action"]
                p_press = p["pressure_bar"]
                p_stat = p["status"]
                is_sim = False

            plan_rows.append({
                "pipe": pid,
                "material": p["material"],
                "install_year": p["install_year"],
                "age": p_age,
                "pressure_bar": p_press,
                "status": p_stat,
                "health": p_health,
                "failure_chance": p_fail,
                "criticality": p_crit,
                "risk": p_risk,
                "advice": p_adv,
                "action": p_adv,
                "has_backup": self.has_alternate_route(pid),
                "road": self.road_impact(pid),
                "is_simulated": is_sim
            })

        plan_rows.sort(key=lambda x: x["risk"], reverse=True)
        ranked_plan = [
            {"rank": idx + 1, **row}
            for idx, row in enumerate(plan_rows)
        ]

        return {
            "pipe_id": pipe_id,
            "status": status,
            "reason": reason,
            "health_score": h_score,
            "failure_chance": fail_chance,
            "criticality": crit_label,
            "risk": calc_risk,
            "impact": affected_areas,
            "road_impact": road_impact,
            "power_failure_impact": power_failure_impact,
            "advice": adv,
            "repair_plan": ranked_plan
        }

    # ---------- reports ----------
    def repair_plan(self, current_year=None):
        ranking = sorted(self.pipes, key=lambda pid: self.risk(pid, current_year=current_year), reverse=True)
        cur_year = current_year if current_year is not None else date.today().year
        return [{
            "rank": i,
            "pipe": pid,
            "material": self.pipes[pid]["material"],
            "install_year": self.pipes[pid]["install_year"],
            "age": cur_year - self.pipes[pid]["install_year"],
            "status": self.pipes[pid]["status"],
            "pressure_bar": self.pipes[pid]["pressure_bar"],
            "risk": self.risk(pid, current_year=current_year),
            "health": self.health_score(pid, current_year=current_year),
            "failure_chance": round(1.0 - self.health_score(pid, current_year=current_year), 2),
            "severity": self.criticality(pid),
            "criticality": self.criticality_label_and_weight(pid)[0],
            "backup": self.has_alternate_route(pid),
            "has_backup": self.has_alternate_route(pid),
            "road": self.road_impact(pid),
            "advice": self.structured_advice(pid, current_year=current_year)["action"],
            "advice_details": self.structured_advice(pid, current_year=current_year)
        } for i, pid in enumerate(ranking, start=1)]

    def print_repair_plan(self):
        print("Repair priority (pehla wala pehle repair):")
        for r in self.repair_plan():
            print(f"{r['rank']}. {r['pipe']} | status: {r['status']} | risk: {r['risk']} | "
                  f"health: {r['health']} | severity: {r['severity']} | backup: {r['backup']}")
            print("   ->", r["advice"])
