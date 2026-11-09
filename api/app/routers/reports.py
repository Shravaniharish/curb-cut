from __future__ import annotations

from fastapi import APIRouter, Depends

from app.deps import get_store
from app.schemas import ReportCreate, ReportResult
from app.services.store import Store
from app.telemetry import span

router = APIRouter(prefix="/api", tags=["reports"])


@router.post("/reports", response_model=ReportResult, status_code=201)
def create_report(body: ReportCreate, store: Store = Depends(get_store)) -> ReportResult:
    """Two matching reports from different devices within 10 minutes become a venue change. The device token is a
    random string made by the app, not tied to a person."""
    with span("reports.create") as s:
        result = store.add_report(body)
        s.set_attribute("confirmed", result.confirmed)
        return result
