"use client";

/**
 * Browser telemetry (real user monitoring) to Dash0 through OpenTelemetry. Off unless NEXT_PUBLIC_OTEL_EXPORTER_URL is
 * set. Records page loads and API calls only: no click targets, no form values, no search text, no profile.
 * The URL should point at a same-origin path that your ingress forwards to Dash0, or a Dash0 endpoint with a
 * public-safe ingest token. Never put a token with broader rights into a NEXT_PUBLIC_ variable.
 */
import { useEffect } from "react";

const EXPORTER_URL = process.env.NEXT_PUBLIC_OTEL_EXPORTER_URL ?? "";
let started = false;

export function Rum() {
  useEffect(() => {
    if (!EXPORTER_URL || started) return;
    started = true;
    (async () => {
      try {
        const [{ WebTracerProvider, BatchSpanProcessor }, { OTLPTraceExporter }, { resourceFromAttributes }, { ZoneContextManager }, { registerInstrumentations }, { DocumentLoadInstrumentation }, { FetchInstrumentation }] =
          await Promise.all([
            import("@opentelemetry/sdk-trace-web"),
            import("@opentelemetry/exporter-trace-otlp-http"),
            import("@opentelemetry/resources"),
            import("@opentelemetry/context-zone"),
            import("@opentelemetry/instrumentation"),
            import("@opentelemetry/instrumentation-document-load"),
            import("@opentelemetry/instrumentation-fetch"),
          ]);
        const provider = new WebTracerProvider({
          resource: resourceFromAttributes({ "service.name": "curb-cut-web" }),
          spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter({ url: EXPORTER_URL }))],
        });
        provider.register({ contextManager: new ZoneContextManager() });
        registerInstrumentations({
          instrumentations: [new DocumentLoadInstrumentation(), new FetchInstrumentation({ propagateTraceHeaderCorsUrls: [/.*/] })],
        });
      } catch {
        // Telemetry must never break the app.
      }
    })();
  }, []);
  return null;
}
