import random
from collections import deque
from datetime import date

import networkx as nx

random.seed(42)   # same simulation output every run


class RampurTwin:
    # --- settings you can tune ---
    LEAK_THRESHOLD = 1.0      # bar: a reading below this is "low"
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
    def health_score(self, pipe_id):
        pipe = self.pipes[pipe_id]
        age = date.today().year - pipe["install_year"]
        score = 1.0 - age * 0.01
        if pipe["material"] == "cast iron":
            score -= 0.15

        hist = self.readings[pipe_id]
        avg_pressure = sum(hist) / len(hist) if hist else pipe["pressure_bar"]
        penalty = max(0, (self.NORMAL_MIN - avg_pressure) / self.NORMAL_MIN) * 0.5
        score -= penalty
        return round(max(score, 0), 2)

    def risk(self, pipe_id):
        return round((1 - self.health_score(pipe_id)) * self.criticality(pipe_id), 2)

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
    def advice(self, pipe_id):
        if self.pipes[pipe_id]["status"] == "leak suspected":
            text = f"{pipe_id}: URGENT repair karo (leak suspected)"
        else:
            text = f"{pipe_id}: repair karo"

        if self.criticality(pipe_id) == 0 and self.has_alternate_route(pipe_id):
            text += " | backup route hai, kam urgent"

        road = self.roads.get(self.runs_under.get(pipe_id))
        if road is None:
            text += " | road data nahi mila"
        elif road["condition"] < 0.7:
            text += f" + {road['name']} bhi saath mein theek karo (condition {road['condition']})"
        return text

    # ---------- reports ----------
    def repair_plan(self):
        ranking = sorted(self.pipes, key=self.risk, reverse=True)
        return [{
            "rank": i, "pipe": pid, "status": self.pipes[pid]["status"],
            "risk": self.risk(pid), "health": self.health_score(pid),
            "severity": self.criticality(pid), "backup": self.has_alternate_route(pid),
            "road": self.road_impact(pid), "advice": self.advice(pid),
        } for i, pid in enumerate(ranking, start=1)]

    def print_repair_plan(self):
        print("Repair priority (pehla wala pehle repair):")
        for r in self.repair_plan():
            print(f"{r['rank']}. {r['pipe']} | status: {r['status']} | risk: {r['risk']} | "
                  f"health: {r['health']} | severity: {r['severity']} | backup: {r['backup']}")
            print("   ->", r["advice"])
