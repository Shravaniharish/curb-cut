from __future__ import annotations

import hmac

from fastapi import Header, HTTPException

from app.config import settings


def require_organizer(x_organizer_key: str | None = Header(default=None)) -> None:
    """Organizer actions change what everyone sees, so they can be locked with ORGANIZER_KEY."""
    if not settings.organizer_key:
        return
    if not x_organizer_key or not hmac.compare_digest(x_organizer_key, settings.organizer_key):
        raise HTTPException(401, "Organizer actions need the organizer key.")
