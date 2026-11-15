import sqlite3
import threading
from datetime import datetime


class Storage:
    """Saves every accepted sensor message in SQLite, so history survives a restart."""

    def __init__(self, path):
        self._lock = threading.Lock()
        self.conn = sqlite3.connect(str(path), check_same_thread=False)
        self.conn.execute(
            """CREATE TABLE IF NOT EXISTS readings (
                   id       INTEGER PRIMARY KEY AUTOINCREMENT,
                   time     TEXT NOT NULL,
                   asset_id TEXT NOT NULL,
                   metric   TEXT NOT NULL,
                   value    REAL NOT NULL
               )"""
        )
        self.conn.commit()

    def save(self, time, asset_id, metric, value):
        with self._lock:
            self.conn.execute(
                "INSERT INTO readings (time, asset_id, metric, value) VALUES (?, ?, ?, ?)",
                (time.isoformat(), asset_id, metric, value),
            )
            self.conn.commit()

    @staticmethod
    def _row(r):
        return {"time": datetime.fromisoformat(r[0]), "asset_id": r[1],
                "metric": r[2], "value": r[3]}

    def all_readings(self):
        """Every saved reading, oldest first."""
        with self._lock:
            rows = self.conn.execute(
                "SELECT time, asset_id, metric, value FROM readings ORDER BY id").fetchall()
        return [self._row(r) for r in rows]

    def recent(self, asset_id=None, limit=50):
        """Latest readings first, optionally for one pipe."""
        query = "SELECT time, asset_id, metric, value FROM readings"
        args = []
        if asset_id:
            query += " WHERE asset_id = ?"
            args.append(asset_id)
        query += " ORDER BY id DESC LIMIT ?"
        args.append(limit)
        with self._lock:
            rows = self.conn.execute(query, args).fetchall()
        return [self._row(r) for r in rows]

    def count(self):
        with self._lock:
            return self.conn.execute("SELECT COUNT(*) FROM readings").fetchone()[0]

    def replay_into(self, twin):
        """Feed all saved readings back into a fresh twin: status, readings window,
        history and alerts are rebuilt exactly as they were."""
        for r in self.all_readings():
            twin.clock = r["time"]
            twin.update_state({"asset_id": r["asset_id"], "metric": r["metric"],
                               "value": r["value"]})
        return twin
