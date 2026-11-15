import asyncio
import json
import pytest
from app import app, twin


async def call_asgi(method, path, body=None):
    body_bytes = json.dumps(body).encode() if body is not None else b""
    response = {"status": 0, "headers": [], "body": b""}

    async def receive():
        return {"type": "http.request", "body": body_bytes, "more_body": False}

    async def send(event):
        if event["type"] == "http.response.start":
            response["status"] = event["status"]
            response["headers"] = event["headers"]
        elif event["type"] == "http.response.body":
            response["body"] += event.get("body", b"")

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "headers": [(b"content-type", b"application/json")],
        "server": ("127.0.0.1", 8000),
        "client": ("127.0.0.1", 12345)
    }
    await app(scope, receive, send)
    resp_data = json.loads(response["body"]) if response["body"] else {}
    return response["status"], resp_data


def test_network_endpoint_structure():
    status, data = asyncio.run(call_asgi("GET", "/network"))
    assert status == 200
    assert "nodes" in data
    assert "pipes" in data
    assert "transformers" in data
    assert "depends_on" in data

    assert len(data["nodes"]) == 12
    for node in data["nodes"]:
        assert "id" in node
        assert "name" in node
        assert "type" in node
        assert "x" in node and isinstance(node["x"], (int, float))
        assert "y" in node and isinstance(node["y"], (int, float))

    assert len(data["pipes"]) == 12
    for pipe in data["pipes"]:
        assert "id" in pipe
        assert "from" in pipe
        assert "to" in pipe
        assert "material" in pipe
        assert "install_year" in pipe
        assert "pressure_bar" in pipe
        assert "status" in pipe
        assert "road" in pipe


def test_analyze_operational_and_leak_dry_run():
    # Record baseline state
    pipe_id = "PIPE-RMP-0001"
    orig_pressure = twin.pipes[pipe_id]["pressure_bar"]
    orig_status = twin.pipes[pipe_id]["status"]
    orig_alerts_count = len(twin.alerts)
    orig_history_count = len(twin.history)

    # 1. Operational analysis
    status, data = asyncio.run(call_asgi("POST", "/analyze", {"pipe_id": pipe_id, "pressure_bar": 2.5}))
    assert status == 200
    assert data["status"] == "operational"
    assert "normal operating range" in data["reason"].lower()
    assert 0.0 <= data["health_score"] <= 1.0
    assert 0.0 <= data["failure_chance"] <= 1.0
    assert data["criticality"] in ("LOW", "MEDIUM", "HIGH")
    assert 0.0 <= data["risk"] <= 1.0
    assert isinstance(data["impact"], list)
    assert "advice" in data and "action" in data["advice"]
    assert "repair_plan" in data and len(data["repair_plan"]) == 12

    # 2. Leak analysis
    status_leak, data_leak = asyncio.run(call_asgi("POST", "/analyze", {"pipe_id": pipe_id, "pressure_bar": 0.4}))
    assert status_leak == 200
    assert data_leak["status"] == "leak suspected"
    assert "leak threshold" in data_leak["reason"].lower()
    assert data_leak["advice"]["action"] in ("REPLACE IMMEDIATELY", "INSPECT TODAY")

    # 3. VERIFY STATE WAS NOT CHANGED (dry run assertion)
    assert twin.pipes[pipe_id]["pressure_bar"] == orig_pressure
    assert twin.pipes[pipe_id]["status"] == orig_status
    assert len(twin.alerts) == orig_alerts_count
    assert len(twin.history) == orig_history_count


def test_analyze_validation_errors():
    # Unknown pipe
    status, _ = asyncio.run(call_asgi("POST", "/analyze", {"pipe_id": "PIPE-UNKNOWN", "pressure_bar": 2.0}))
    assert status == 422

    # Boolean pressure (should not be coerced)
    status, _ = asyncio.run(call_asgi("POST", "/analyze", {"pipe_id": "PIPE-RMP-0001", "pressure_bar": True}))
    assert status == 422

    # Out of range negative
    status, _ = asyncio.run(call_asgi("POST", "/analyze", {"pipe_id": "PIPE-RMP-0001", "pressure_bar": -0.5}))
    assert status == 422

    # Out of range > 10
    status, _ = asyncio.run(call_asgi("POST", "/analyze", {"pipe_id": "PIPE-RMP-0001", "pressure_bar": 12.0}))
    assert status == 422


def test_power_failure_endpoint():
    # Valid transformer
    status, data = asyncio.run(call_asgi("GET", "/power-failure/TR-RMP-0001"))
    assert status == 200
    assert data["transformer_id"] == "TR-RMP-0001"
    assert "Main Transformer" in data["transformer_name"]
    assert "power_loss" in data
    assert "water_cascade" in data

    # Unknown transformer
    status, _ = asyncio.run(call_asgi("GET", "/power-failure/TR-NONEXISTENT"))
    assert status == 404


def test_sensor_validation():
    # Unknown asset
    status, _ = asyncio.run(call_asgi("POST", "/sensor", {"asset_id": "PIPE-UNKNOWN", "value": 2.0}))
    assert status == 404

    # Boolean value rejected with 422
    status, _ = asyncio.run(call_asgi("POST", "/sensor", {"asset_id": "PIPE-RMP-0001", "value": False}))
    assert status == 422

    # Out of range value rejected with 422
    status, _ = asyncio.run(call_asgi("POST", "/sensor", {"asset_id": "PIPE-RMP-0001", "value": 15.0}))
    assert status == 422

