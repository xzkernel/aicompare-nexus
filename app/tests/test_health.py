import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    """Test that the health endpoint returns 200 OK"""
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"ok": True, "status": "healthy"}

def test_root_endpoint():
    """Test that the root endpoint returns API information"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "AI Proxy API"
    assert "endpoints" in data


