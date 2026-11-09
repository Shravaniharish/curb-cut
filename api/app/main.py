from __future__ import annotations

import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import telemetry
from app.config import settings
from app.es import client as es_client
from app.es.ingest import ingest
from app.routers import changes, organizer, plan, replan, reports, search, sessions, venue


@asynccontextmanager
async def lifespan(_: FastAPI):
    """With Elasticsearch configured, make sure the indices and programme exist. A failure never blocks startup."""
    if es_client.enabled() and os.getenv("ES_AUTO_INGEST", "1") == "1":
        try:
            await asyncio.to_thread(ingest)
        except Exception as exc:  # noqa: BLE001
            es_client.log.warning("elasticsearch ingest skipped: %s", type(exc).__name__)
    yield


app = FastAPI(title="Curb Cut API", lifespan=lifespan)

# Browser origins only. No cookies and no credentials are used, so nothing about a person rides along.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Organizer-Key", "traceparent", "tracestate"],
)

for module in (venue, search, plan, replan, changes, reports, organizer, sessions):
    app.include_router(module.router)

telemetry.setup(app)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}
