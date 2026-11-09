"use client";

import { OrganizerDashboard } from "@/components/OrganizerDashboard";
import { WaitForState } from "@/components/WaitForState";

/** Screen 12: organizer dashboard (laptop). */
export default function OrganizerPage() {
  return (
    <WaitForState>
      <OrganizerDashboard />
    </WaitForState>
  );
}
