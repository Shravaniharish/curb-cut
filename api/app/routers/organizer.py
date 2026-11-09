from __future__ import annotations

from fastapi import APIRouter, Depends

from app.data.venue import PROVENANCE
from app.deps import get_store
from app.schemas import AccessGapOut, OrganizerSummary
from app.security import require_organizer
from app.services.present import venue_out
from app.services.store import Store
from app.telemetry import span

router = APIRouter(prefix="/api/organizer", tags=["organizer"], dependencies=[Depends(require_organizer)])


def _count(n: int, one: str, many: str) -> str:
    return f"{n} {one if n == 1 else many}"


def access_gaps(store: Store) -> list[AccessGapOut]:
    """Gaps the access team can still fix today. Unknown counts as a gap: nobody can rely on it."""
    talks = store.talks()
    no_captions = [t for t in talks if t.access.captions in ("none", "unknown")]
    slides = [t for t in talks if t.access.slide_descriptions != "verified"]
    not_step_free = [t for t in talks if t.access.step_free_entrance != "confirmed"]
    interpreter = [t for t in not_step_free if t.access.interpreter == "available"]
    return [
        AccessGapOut(
            id="no_captions",
            summary=f"{_count(len(no_captions), 'talk has', 'talks have')} no confirmed captions",
            talk_ids=[t.id for t in no_captions],
        ),
        AccessGapOut(
            id="slides_not_verified",
            summary=f"{_count(len(slides), 'talk has', 'talks have')} no verified slide descriptions",
            talk_ids=[t.id for t in slides],
        ),
        AccessGapOut(
            id="room_not_step_free",
            summary=f"{_count(len(not_step_free), 'talk is', 'talks are')} in a room not confirmed step-free",
            talk_ids=[t.id for t in not_step_free],
        ),
        AccessGapOut(
            id="interpreter_not_step_free",
            summary=(
                f"{_count(len(interpreter), 'interpreter talk is', 'interpreter talks are')} "
                "in a room not confirmed step-free"
            ),
            talk_ids=[t.id for t in interpreter],
        ),
    ]


@router.get("/summary", response_model=OrganizerSummary)
def summary(store: Store = Depends(get_store)) -> OrganizerSummary:
    """Venue status, changes, reports, the anonymous ack counts and the access gaps. Counts only."""
    with span("organizer_summary"):
        return OrganizerSummary(
            venue=venue_out(store.graph(), PROVENANCE),
            changes=list(reversed(store.changes)),
            reports=store.report_summaries(),
            acks=store.ack_counts(),
            gaps=access_gaps(store),
        )
