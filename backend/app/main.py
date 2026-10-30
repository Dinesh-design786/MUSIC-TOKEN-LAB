from __future__ import annotations

from collections import Counter
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Music Token Lab API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])


class Event(BaseModel):
    track_id: str
    instrument: str
    pitch: str | None = None
    duration_beats: float = Field(gt=0)
    velocity: int = Field(ge=0, le=127)
    event_type: Literal["note", "rest"]
    onset_beats: float = Field(ge=0)


class EventsRequest(BaseModel):
    events: list[Event]


class SequenceRequest(BaseModel):
    ids: list[int]
    sequence_length: int = Field(default=16, ge=1, le=2048)
    stride: int = Field(default=4, ge=1, le=2048)


class EncodingRequest(BaseModel):
    events: list[Event]
    ids: list[int] = []


def token_for(event: Event) -> str:
    return f"REST_D{event.duration_beats:g}" if event.event_type == "rest" else f"NOTE_{event.pitch}_D{event.duration_beats:g}"


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "music-token-lab"}


@app.post("/api/validate")
def validate(request: EventsRequest) -> dict:
    issues = []
    signatures: set[tuple] = set()
    for index, event in enumerate(request.events):
        if event.event_type == "note" and not event.pitch:
            issues.append({"row": index + 1, "field": "pitch", "message": "Notes must have a pitch."})
        if event.event_type == "rest" and event.pitch:
            issues.append({"row": index + 1, "field": "pitch", "message": "Rests ignore pitch values."})
        signature = (event.track_id, event.onset_beats, event.pitch, event.duration_beats)
        if signature in signatures:
            issues.append({"row": index + 1, "field": "duplicate", "message": "Duplicate event signature detected."})
        signatures.add(signature)
    return {"total": len(request.events), "valid": len(request.events) - len({issue["row"] for issue in issues}), "issues": issues}


@app.post("/api/vocabulary")
def vocabulary(request: EventsRequest) -> dict:
    frequencies = Counter(token_for(event) for event in request.events)
    tokens = sorted(frequencies, key=lambda value: (value.split("_")[0], value))
    mapping = [{"token": token, "id": index + 1, "frequency": frequencies[token]} for index, token in enumerate(tokens)]
    return {"vocabulary": mapping, "id_to_token": {str(item["id"]): item["token"] for item in mapping}}


@app.post("/api/clean")
def clean(request: EventsRequest) -> dict:
    issues = validate(request)["issues"]
    invalid_rows = {issue["row"] for issue in issues if issue["field"] != "pitch" or "Notes" in issue["message"]}
    cleaned = [event for index, event in enumerate(request.events, start=1) if index not in invalid_rows]
    return {"cleaned_events": cleaned, "removed_rows": sorted(invalid_rows), "review_issues": issues}


@app.post("/api/encode")
def encode(request: EventsRequest) -> dict:
    result = vocabulary(request)
    ids = {item["token"]: item["id"] for item in result["vocabulary"]}
    return {"ids": [ids[token_for(event)] for event in request.events], "vocabulary": result["vocabulary"]}


@app.post("/api/decode")
def decode(request: EncodingRequest) -> dict:
    if not request.ids:
        return {"tokens": []}
    result = vocabulary(request)
    lookup = {item["id"]: item["token"] for item in result["vocabulary"]}
    unknown = [token_id for token_id in request.ids if token_id not in lookup]
    return {"tokens": [lookup.get(token_id, "<UNK>") for token_id in request.ids], "unknown_ids": unknown}


@app.post("/api/sequences")
def sequences(request: SequenceRequest) -> dict:
    if request.sequence_length >= len(request.ids):
        raise HTTPException(status_code=422, detail="sequence_length must be smaller than the number of IDs")
    windows = [{"input": request.ids[start : start + request.sequence_length], "target": request.ids[start + 1 : start + request.sequence_length + 1]} for start in range(0, len(request.ids) - request.sequence_length, request.stride)]
    return {"count": len(windows), "windows": windows}
