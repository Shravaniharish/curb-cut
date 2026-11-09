"""Session companion: transcript replay, "Catch me up", and written questions for the presenter.

Transcripts are original canned lines (no live captioner). Questions carry no attendee id: they are venue content,
like a card passed to the stage.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sse_starlette.sse import EventSourceResponse

from app.data.talks import TALK_BY_ID
from app.deps import get_store
from app.schemas import CatchUpOut, QuestionCreate, QuestionOut, TranscriptChunkOut
from app.security import require_organizer
from app.services.store import Question, Store
from app.telemetry import span

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

CATCH_UP_WINDOW_SEC = 60
CATCH_UP_MAX_BULLETS = 3
_TRANSCRIPTS = Path(__file__).parent.parent / "data" / "transcripts.json"
_CHUNKS = [TranscriptChunkOut(**c) for c in json.loads(_TRANSCRIPTS.read_text())]


def chunks_for(talk_id: str) -> list[TranscriptChunkOut]:
    if talk_id not in TALK_BY_ID:
        raise HTTPException(404, "That session is not in the schedule.")
    return [c for c in _CHUNKS if c.talk_id == talk_id]


def question_out(q: Question) -> QuestionOut:
    return QuestionOut(id=q.id, talk_id=q.talk_id, text=q.text, asked_at=q.asked_at, read_out_at=q.read_out_at)


@router.get("/{talk_id}/transcript", response_model=list[TranscriptChunkOut])
def transcript(talk_id: str) -> list[TranscriptChunkOut]:
    with span("sessions.transcript"):
        return chunks_for(talk_id)


@router.get("/{talk_id}/stream")
async def stream(
    talk_id: str, from_sec: int = Query(0, ge=0), speed: float = Query(1.0, gt=0, le=1000)
) -> EventSourceResponse:
    """Replay the transcript as Server-Sent Events from ``from_sec``, at ``speed`` times real time."""
    chunks = [c for c in chunks_for(talk_id) if c.offset_sec >= from_sec]

    async def events():
        at = from_sec
        for c in chunks:
            await asyncio.sleep(max(0, c.offset_sec - at) / speed)
            at = c.offset_sec
            yield {"event": "chunk", "id": str(c.offset_sec), "data": c.model_dump_json()}
        yield {"event": "end", "data": "{}"}

    return EventSourceResponse(events(), ping=None)


@router.get("/{talk_id}/catchup", response_model=CatchUpOut)
def catch_up(talk_id: str, at_sec: int = Query(..., ge=0)) -> CatchUpOut:
    """The last few lines from the past minute. No language model: the plain fallback, labelled as such."""
    with span("sessions.catchup"):
        recent = [c for c in chunks_for(talk_id) if at_sec - CATCH_UP_WINDOW_SEC < c.offset_sec <= at_sec]
        return CatchUpOut(
            talk_id=talk_id, at_sec=at_sec, bullets=recent[-CATCH_UP_MAX_BULLETS:], method="recent_lines"
        )


@router.get("/{talk_id}/questions", response_model=list[QuestionOut])
def list_questions(talk_id: str, store: Store = Depends(get_store)) -> list[QuestionOut]:
    chunks_for(talk_id)
    return [question_out(q) for q in store.questions if q.talk_id == talk_id]


@router.post("/{talk_id}/questions", response_model=QuestionOut, status_code=201)
def ask(talk_id: str, body: QuestionCreate, store: Store = Depends(get_store)) -> QuestionOut:
    chunks_for(talk_id)
    with span("sessions.ask"):
        return question_out(store.add_question(talk_id, body.text, body.asked_at))


@router.post(
    "/{talk_id}/questions/{question_id}/read",
    response_model=QuestionOut,
    dependencies=[Depends(require_organizer)],
)
def mark_read(talk_id: str, question_id: str, store: Store = Depends(get_store)) -> QuestionOut:
    """The presenter marks a question as read out. It then appears in the transcript."""
    with span("sessions.read_out"):
        q = store.read_out(talk_id, question_id)
        if q is None:
            raise HTTPException(404, "We could not find that question.")
        return question_out(q)
