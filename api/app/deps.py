"""One shared Store for the process. Tests replace it with ``app.dependency_overrides``."""

from __future__ import annotations

from app.services.store import Store

_store = Store()


def get_store() -> Store:
    return _store


def reset_store() -> Store:
    global _store
    _store = Store()
    return _store
