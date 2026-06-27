#!/usr/bin/env python3
"""Smoke test — verifies backend is reachable on port 8001."""

import sys

import requests

BASE = "http://127.0.0.1:8001"


def test_backend() -> bool:
    print("Testing ModelWise backend…")

    try:
        r = requests.get(f"{BASE}/health", timeout=5)
        r.raise_for_status()
        print(f"OK /health -> {r.json()}")
    except requests.exceptions.ConnectionError:
        print("FAIL Backend not running on port 8001")
        print("  Start: cd backend && python -m uvicorn main:app --port 8001")
        return False
    except Exception as e:
        print(f"FAIL /health error: {e}")
        return False

    try:
        r = requests.get(f"{BASE}/api/v1/models", timeout=10)
        r.raise_for_status()
        data = r.json()
        count = data.get("modelCount") or len(
            [m for p in data.get("providers", []) for m in p.get("models", [])]
        )
        print(f"OK /api/v1/models -> {count} models")
    except Exception as e:
        print(f"FAIL /api/v1/models error: {e}")
        return False

    try:
        r = requests.post(
            f"{BASE}/api/v1/ask",
            json={
                "prompt": "ping",
                "leftModel": "gpt-4o",
                "rightModel": "gemini-2.5-flash",
            },
            timeout=15,
        )
        # BYOK: 4xx without keys is expected — we only verify routing layer responds
        if r.status_code == 200:
            print("OK /api/v1/ask -> 200 (keys configured)")
        else:
            print(f"OK /api/v1/ask -> {r.status_code} (expected without BYOK keys)")
    except Exception as e:
        print(f"FAIL /api/v1/ask error: {e}")
        return False

    print("Backend smoke test passed.")
    return True


if __name__ == "__main__":
    sys.exit(0 if test_backend() else 1)
