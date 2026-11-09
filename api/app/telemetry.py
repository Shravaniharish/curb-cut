"""OpenTelemetry. One span per API route, and no profile data or query text in any attribute.

Exporting is off unless ``OTEL_EXPORTER_OTLP_ENDPOINT`` is set, so local runs and tests need no collector.
Attributes are counts and booleans only. A caller that passes a string value is a bug: ``span`` drops it.
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from contextlib import contextmanager

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

_tracer = trace.get_tracer("curb-cut-api")
_configured = False


def setup(app) -> None:  # noqa: ANN001 - FastAPI app
    """Install the exporter (when configured) and instrument every route with a server span."""
    global _configured
    if not _configured:
        provider = TracerProvider(
            resource=Resource.create({"service.name": os.getenv("OTEL_SERVICE_NAME", "curb-cut-api")})
        )
        if os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"):
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

            provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
        trace.set_tracer_provider(provider)
        _configured = True
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

    # Request and response bodies are never recorded: the instrumentation only sees method, route and status.
    FastAPIInstrumentor.instrument_app(app, excluded_urls="healthz")


@contextmanager
def span(name: str, **attributes: int | bool | float) -> Iterator[trace.Span]:
    with _tracer.start_as_current_span(name) as s:
        for key, value in attributes.items():
            if isinstance(value, bool | int | float):
                s.set_attribute(key, value)
        yield s
