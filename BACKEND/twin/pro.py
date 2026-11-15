import textwrap
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
import networkx as nx

from twin.core import RampurTwin


class RampurTwinPro(RampurTwin):
    # Assumed values (change these to whatever you want to claim in your report)
    REPAIR_COST = {"PVC": 15000, "cast iron": 30000}     # Rs per pipe repair
    REPAIR_HOURS = {"PVC": 4, "cast iron": 8}
    ROAD_COST = 20000                                     # Rs per road dug and restored
    TYPE_COLORS = {"reservoir": "#1f77b4", "junction": "#bbbbbb",
                   "hospital": "#d62728", "school": "#ff7f0e"}
    STATUS_COLORS = {"operational": "green", "watch": "orange",
                     "leak suspected": "red", "no flow (power)": "gray"}

    def __init__(self, data, runs_under, depends_on, start=None):
        super().__init__(data, runs_under, depends_on)
        self.runs_under = runs_under
        self.depends_on = depends_on
        self.clock = start or datetime(2026, 11, 10, 8, 0)   # simulated clock
        self.history = []     # every reading
        self.alerts = []      # every leak alert

    # ================= HISTORY (#4) =================
    def tick(self, minutes=1):
        self.clock += timedelta(minutes=minutes)

      
    def update_state(self, msg):
        pid = msg.get("asset_id") if isinstance(msg, dict) else None

        before = self.pipes[pid]["status"] if pid in self.pipes else None

        pipe = super().update_state(msg)

        if pipe is None:
            # Bad message was rejected
            return None

        if msg["metric"] == "pressure_bar":
            self.history.append({
                "time": self.clock,
                "pipe": pid,
                "pressure_bar": msg["value"],
                "status": pipe["status"]
            })

            if pipe["status"] == "leak suspected" and before != "leak suspected":
                self.alerts.append({
                    "time": self.clock,
                    "pipe": pid,
                    "pressure_bar": msg["value"],
                    "affected": self.impact(pid),
                    "severity": self.criticality(pid),
                    "road": self.road_impact(pid)
                })

        return pipe

           
             

    def simulate(self, rounds=10, leak_pipe=None, leak_from=4, verbose=True):
        for r in range(rounds):
            for pid in self.pipes:
                leaking = (pid == leak_pipe and r >= leak_from)
                n_before = len(self.alerts)
                self.update_state(self.make_message(pid, leaking))
                if verbose and len(self.alerts) > n_before:
                    a = self.alerts[-1]
                    print(f"[{a['time']:%H:%M}] ALERT {a['pipe']} | affected: {a['affected']} "
                          f"| severity: {a['severity']} | road: {a['road']}")
            self.tick()

    def history_df(self):
        return pd.DataFrame(self.history)

    def alerts_df(self):
        return pd.DataFrame(self.alerts)

    def alert_counts(self):
        if not self.alerts:
            return pd.Series(dtype=int)
        return self.alerts_df()["pipe"].value_counts()

    def trend(self, pipe_id, last=6):
        """Slope of pressure over the last few readings (bar per reading)."""
        df = self.history_df()
        d = df[df["pipe"] == pipe_id].tail(last)
        if len(d) < 3:
            return None
        return round(float(np.polyfit(range(len(d)), d["pressure_bar"], 1)[0]), 3)

    def trend_report(self, last=6):
        print("Pressure trend per pipe:")
        for pid in self.pipes:
            s = self.trend(pid, last)
            if s is None:
                continue
            cur = self.pipes[pid]["pressure_bar"]
            if s < -0.05 and cur > self.LEAK_THRESHOLD:
                eta = (cur - self.LEAK_THRESHOLD) / (-s)
                msg = f"falling {s} bar/reading -> may cross {self.LEAK_THRESHOLD} bar in ~{eta:.0f} readings"
            elif s < -0.05:
                msg = f"falling ({s} bar/reading), already below threshold"
            else:
                msg = "stable"
            print(f"  {pid}: {msg}")

    def plot_pressure(self, pipe_ids=None, trend_line=True):
        df = self.history_df()
        if df.empty:
            print("No history yet. Run twin.simulate(...) first.")
            return
        if pipe_ids is None:
            pipe_ids = list(self.alert_counts().index) or list(self.pipes)[:3]
        fig, ax = plt.subplots(figsize=(10, 4.5))
        for pid in pipe_ids:
            d = df[df["pipe"] == pid]
            line, = ax.plot(d["time"], d["pressure_bar"], marker="o", ms=3, label=pid)
            if trend_line and len(d) >= 3:
                x = np.arange(len(d))
                m, c = np.polyfit(x, d["pressure_bar"], 1)
                ax.plot(d["time"], m * x + c, "--", color=line.get_color(), alpha=0.5)
        for a in self.alerts:
            if a["pipe"] in pipe_ids:
                ax.axvline(a["time"], color="red", alpha=0.35)
                ax.text(a["time"], 2.5, " ALERT", color="red", fontsize=8)
        ax.axhline(self.LEAK_THRESHOLD, color="red", ls=":", label="leak threshold")
        ax.set_ylabel("Pressure (bar)")
        ax.set_xlabel("Time")
        ax.set_title("Pipe pressure over time (dashed = trend line)")
        ax.legend(fontsize=8)
        fig.autofmt_xdate()
        plt.show()

    # ================= DRAWING =================
    def _layout(self):
        g = self.graph
        src = self._sources(g)
        for n in g.nodes:
            d = [nx.shortest_path_length(g, s, n) for s in src if nx.has_path(g, s, n)]
            g.nodes[n]["layer"] = min(d) if d else 0
        return nx.multipartite_layout(g, subset_key="layer")

    def draw(self, highlight=None, failed=None, title="Rampur water network"):
        g = self.graph
        pos = self._layout()
        highlight, failed = set(highlight or []), set(failed or [])

        fig, ax = plt.subplots(figsize=(12, 6))
        nodes = list(g.nodes)
        nx.draw_networkx_nodes(
            g, pos, nodelist=nodes, node_size=1700, ax=ax,
            node_color=[self.TYPE_COLORS.get(g.nodes[n]["type"], "#999999") for n in nodes],
            edgecolors=["red" if n in highlight else "black" for n in nodes],
            linewidths=[4 if n in highlight else 1 for n in nodes])

        edges = list(g.edges(data=True))
        colors, styles, elabels = [], [], {}
        for u, v, d in edges:
            pid = d["pipe_id"]
            status = self.pipes[pid]["status"]
            if pid in failed:
                colors.append("black"); styles.append("dashed")
            else:
                colors.append(self.STATUS_COLORS.get(status, "green")); styles.append("solid")
            elabels[(u, v)] = f"P{int(pid[-4:])} | {self.pipes[pid]['pressure_bar']}b"
        nx.draw_networkx_edges(g, pos, edgelist=[(u, v) for u, v, _ in edges],
                               edge_color=colors, style=styles, width=2.5, arrows=True,
                               arrowsize=18, node_size=1700, ax=ax)
        nx.draw_networkx_edge_labels(g, pos, edge_labels=elabels, font_size=7, ax=ax)
        nx.draw_networkx_labels(g, pos, ax=ax, font_size=7,
                                labels={n: textwrap.fill(g.nodes[n]["name"], 12) for n in nodes})

        handles = [Line2D([0], [0], marker="o", ls="", color=c, label=t, markersize=10)
                   for t, c in self.TYPE_COLORS.items()]
        handles += [Line2D([0], [0], color=c, lw=3, label=s) for s, c in self.STATUS_COLORS.items()]
        handles += [Line2D([0], [0], color="black", lw=2, ls="--", label="failed (what-if)"),
                    Line2D([0], [0], marker="o", ls="", markerfacecolor="white",
                           markeredgecolor="red", markeredgewidth=3, label="loses water", markersize=10)]
        ax.legend(handles=handles, loc="upper left", bbox_to_anchor=(1, 1), fontsize=8)
        ax.set_title(title)
        ax.axis("off")
        plt.tight_layout()
        plt.show()

    # ================= WHAT-IF (#5) =================
    def simulate_failure(self, pipe_ids, show=True):
        if isinstance(pipe_ids, str):
            pipe_ids = [pipe_ids]
        affected_ids = self.affected_nodes(pipe_ids)
        affected = [self.name(n) for n in affected_ids]
        severity = self.criticality(pipe_ids)

        downstream = set()
        for p in pipe_ids:
            t = self.pipes[p]["to"]
            downstream |= nx.descendants(self.graph, t) | {t}
        saved = [self.name(n) for n in downstream if n not in affected_ids]

        roads = sorted({self.road_impact(p) for p in pipe_ids if self.road_impact(p)})
        cost = sum(self.REPAIR_COST.get(self.pipes[p]["material"], 20000) for p in pipe_ids)
        cost += self.ROAD_COST * len(roads)
        hours = sum(self.REPAIR_HOURS.get(self.pipes[p]["material"], 6) for p in pipe_ids)

        if severity >= 10:   priority = "CRITICAL"
        elif severity >= 5:  priority = "HIGH"
        elif severity >= 1:  priority = "MEDIUM"
        else:                priority = "LOW (backup route available)"

        result = {"failed_pipes": pipe_ids, "loses_water": affected,
                  "saved_by_backup": saved, "roads_to_dig": roads,
                  "severity": severity, "priority": priority,
                  "est_cost_rs": cost, "est_hours": hours}

        print(f"WHAT-IF: {pipe_ids} fail")
        print("  Loses water     :", affected or "nobody")
        print("  Saved by backup :", saved or "none")
        print("  Roads to dig    :", roads or "none")
        print(f"  Severity {severity} -> {priority}")
        print(f"  Estimated cost  : Rs {cost:,} | time: {hours} hours")
        if show:
            self.draw(highlight=affected_ids, failed=pipe_ids,
                      title=f"What-if: {', '.join(pipe_ids)} fail")
        return result
