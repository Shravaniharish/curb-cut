import Link from "next/link";
import { ROUTES } from "@/lib/routes";

/**
 * Development placeholder for screens that belong to another part. It never reports success: the screen does not
 * exist yet. The owner replaces the page file; the route path stays the same.
 */
export function IntegrationPlaceholder({ title, owner, contract }: { title: string; owner: string; contract: string }) {
  return (
    <div className="stack">
      <h1 tabIndex={-1}>{title}</h1>
      <div className="status-note" role="note">
        <strong>Development placeholder.</strong> This screen belongs to {owner} and has not been built yet. Nothing here is a working feature.
      </div>
      <p className="small muted">Route contract: {contract}</p>
      <p>
        <Link href={ROUTES.plan}>Back to my plan</Link>
      </p>
    </div>
  );
}
