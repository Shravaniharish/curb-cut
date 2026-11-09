import { formatTime } from "@/lib/time";

export function LeaveByIndicator({ leaveByIso, travelMinutes, bufferMinutes, stepFree }: { leaveByIso: string; travelMinutes: number; bufferMinutes: number; stepFree: boolean }) {
  return (
    <div>
      <p className="leave-by">
        <span aria-hidden="true">🕑</span>
        <span>Leave by {formatTime(leaveByIso)}</span>
      </p>
      <p className="small muted">
        {travelMinutes} min {stepFree ? "step-free " : ""}trip + {bufferMinutes} min buffer
      </p>
    </div>
  );
}
