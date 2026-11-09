/** A tiny publish/subscribe so the API sync can hand a finished alert to the one component that shows alerts. */
import type { AlertDraft } from "./store";

type Listener = (draft: AlertDraft) => void;
const listeners = new Set<Listener>();

export function publishAlert(draft: AlertDraft): void {
  for (const l of [...listeners]) l(draft);
}

export function subscribeToAlerts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
