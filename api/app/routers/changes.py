"""Venue changes: announce, fix, stream to every open app, and collect anonymous acks.

The stream carries public venue information (like a PA announcement). Each app then works out for itself, with its
own profile, whether it is affected: see POST /api/replan.
"""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from app.deps import get_store
from app.schemas import AckIn, ChangeCreate, ChangeOut
from app.security import require_organizer
from app.services.store import ChangeError, Store
from app.telemetry import span

router = APIRouter(prefix="/api/changes", tags=["changes"])
HEARTBEAT_SECONDS = 15


@router.get("", response_model=list[ChangeOut])
def list_changes(store: Store = Depends(get_store)) -> list[ChangeOut]:
    return list(store.changes)


@router.post("", response_model=ChangeOut, status_code=201, dependencies=[Depends(require_organizer)])
def create_change(body: ChangeCreate, store: Store = Depends(get_store)) -> ChangeOut:
    with span("changes.create", subscribers=len(store.subscribers)):
        try:
            return store.apply_change(body)
        except ChangeError as e:
            raise HTTPException(422, str(e)) from e


@router.post("/{change_id}/fix", response_model=ChangeOut, dependencies=[Depends(require_organizer)])
def fix_change(change_id: str, store: Store = Depends(get_store)) -> ChangeOut:
    with span("changes.fix"):
        change = store.fix(change_id)
        if change is None:
            raise HTTPException(404, "We could not find that change.")
        return change


@router.get("/stream")
async def stream(request: Request, store: Store = Depends(get_store)) -> EventSourceResponse:
    """Server-Sent Events: each new change as JSON, plus a heartbeat comment every 15 seconds."""
    queue = store.subscribe()

    async def events():
        try:
            yield {"event": "ready", "data": "{}"}
            while True:
                if await request.is_disconnected():
                    break
                try:
                    change = await asyncio.wait_for(queue.get(), timeout=HEARTBEAT_SECONDS)
                except TimeoutError:
                    yield {"comment": "heartbeat"}
                    continue
                yield {"event": "change", "id": change.id, "data": change.model_dump_json()}
        finally:
            store.unsubscribe(queue)

    return EventSourceResponse(events(), ping=None)


@router.post("/{change_id}/ack", status_code=204)
def ack(change_id: str, body: AckIn, store: Store = Depends(get_store)) -> None:
    """Anonymous: ``{affected, replan_ms}`` and nothing else. No device id, no profile."""
    with span("changes.ack", affected=body.affected, replan_ms=body.replan_ms):
        if store.change(change_id) is None:
            raise HTTPException(404, "We could not find that change.")
        store.add_ack(body)
