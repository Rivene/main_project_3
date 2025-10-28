from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_healthz():
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_version():
    r = client.get("/version")
    assert r.status_code == 200
    assert "version" in r.json()

def test_compare():
    r = client.post("/api/v1/ocr/compare", json={"left_text":"hello world", "right_text":"hello korea"})
    assert r.status_code == 200
    j = r.json()
    assert "left_unique_terms_preview" in j
    assert "overlap_terms_preview" in j
