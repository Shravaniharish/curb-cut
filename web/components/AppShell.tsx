"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { AppStateProvider, useApp } from "@/lib/store";
import { formatTime } from "@/lib/time";
import { BottomNavigation } from "./BottomNavigation";
import { SecondaryButton } from "./ui";

function ReminderBanner() {
  const { reminderNotice, dismissReminderNotice, state } = useApp();
  if (!reminderNotice) return null;
  const big = state.prefs.notificationStyle === "vibrate_big_text";
  const calm = state.prefs.notificationStyle === "calm_step_by_step";
  return (
    <div role="alert" className="reminder-banner">
      <p className={big ? "big-alert" : undefined} style={{ marginBottom: "0.5rem" }}>
        {calm
          ? `One step: get ready to leave for ${reminderNotice.talkTitle}. Leave by ${formatTime(reminderNotice.leaveByIso)}.`
          : `Time to get ready. Leave by ${formatTime(reminderNotice.leaveByIso)} for ${reminderNotice.talkTitle}.`}
      </p>
      <SecondaryButton onClick={dismissReminderNotice}>Dismiss reminder</SecondaryButton>
    </div>
  );
}

/** Navigation is hidden on the welcome and setup screens. Separate so the pathname read can sit inside Suspense. */
function NavGate() {
  const pathname = usePathname();
  return pathname === "/" || pathname.startsWith("/setup") ? null : <BottomNavigation />;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <header>
        <p className="demo-banner">Demo mode: sample talks, a sample venue, simulated elevator status and a demo clock. Not real conference data.</p>
        <ReminderBanner />
      </header>
      <main id="main" tabIndex={-1} className="page">
        {children}
      </main>
      <Suspense fallback={null}>
        <NavGate />
      </Suspense>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppStateProvider>
      <Shell>{children}</Shell>
    </AppStateProvider>
  );
}
