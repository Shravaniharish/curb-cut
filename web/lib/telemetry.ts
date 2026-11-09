/**
 * Thin wrapper over @opentelemetry/api. Without an SDK registered (Part P2 owns that) these spans are no-ops, so
 * calling this is always safe. Attributes must never contain attendee needs, preferences or raw search text.
 */
import { SpanStatusCode, trace } from "@opentelemetry/api";

type Attrs = Record<string, string | number | boolean>;

export function withSpan<T>(name: string, attrs: Attrs, fn: () => T): T {
  const span = trace.getTracer("curb-cut-web").startSpan(name, { attributes: attrs });
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(
        (v) => {
          span.end();
          return v;
        },
        (e: unknown) => {
          span.setStatus({ code: SpanStatusCode.ERROR, message: e instanceof Error ? e.name : "error" });
          span.end();
          throw e;
        },
      ) as T;
    }
    span.end();
    return result;
  } catch (e) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: e instanceof Error ? e.name : "error" });
    span.end();
    throw e;
  }
}
