from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import telemetry
from app.config import settings
from app.routers import changes, organizer, plan, replan, reports, search, sessions, venue

app = FastAPI(title="Curb Cut API")

# Browser origins only. No cookies and no credentials are used, so nothing about a person rides along.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Organizer-Key"],
)

for module in (venue, search, plan, replan, changes, reports, organizer, sessions):
    app.include_router(module.router)

telemetry.setup(app)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}
