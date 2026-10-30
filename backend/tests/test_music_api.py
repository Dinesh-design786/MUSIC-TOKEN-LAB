from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def sample_events():
    return {"events": [
        {"track_id": "a", "instrument": "Piano", "pitch": "C4", "duration_beats": 1, "velocity": 80, "event_type": "note", "onset_beats": 0},
        {"track_id": "a", "instrument": "Piano", "pitch": None, "duration_beats": 1, "velocity": 0, "event_type": "rest", "onset_beats": 1},
    ]}


def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_vocabulary_and_sequence():
    vocabulary = client.post("/api/vocabulary", json=sample_events()).json()
    assert vocabulary["vocabulary"][0]["id"] == 1
    result = client.post("/api/sequences", json={"ids": [1, 2, 3, 4], "sequence_length": 2, "stride": 1})
    assert result.json()["count"] == 2
