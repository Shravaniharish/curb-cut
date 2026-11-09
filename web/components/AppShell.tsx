"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { LIVE, getTalks } from "@/lib/api";
import { DEMO_TALKS } from "@/lib/fixtures/talks";
import { AppStateProvider, useApp } from "@/lib/store";
import type { Talk } from "@/lib/types";
import { formatTime } from "@/lib/time";
import { BottomNavigation } from "./BottomNavigation";
import { ApiSync } from "./ApiSync";
import { ChangeWatcher } from "./ChangeWatcher";
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

/** Part C laptop screens for the access team and the speaker. They are not the attendee's phone. */
const isStaffScreen = (pathname: string) => pathname.startsWith("/organizer") || pathname.startsWith("/presenter");

/** Navigation is hidden on the welcome, setup and staff screens. Separate so the pathname read can sit inside Suspense. */
function NavGate() {
  const pathname = usePathname();
  return pathname === "/" || pathname.startsWith("/setup") || isStaffScreen(pathname) ? null : <BottomNavigation />;
}

/** The attendee's change alert never opens over the organizer or presenter screens. */
function WatcherGate() {
  const pathname = usePathname();
  return isStaffScreen(pathname) ? null : (
    <>
      <ApiSync />
      <ChangeWatcher />
    </>
  );
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
      {/* Part B: an event change opens the alert over whatever screen the attendee is on. */}
      <Suspense fallback={null}>
        <WatcherGate />
        <NavGate />
      </Suspense>
    </div>
  );
}

/** Live mode: the programme comes from the API. If it cannot be reached the four demo talks are used instead. */
function useProgramme(): Talk[] | null {
  const [talks, setTalks] = useState<Talk[] | null>(LIVE ? null : DEMO_TALKS);
  useEffect(() => {
    if (!LIVE) return;
    let stopped = false;
    getTalks().then(
      (t) => !stopped && setTalks(t.length > 0 ? t : DEMO_TALKS),
      () => !stopped && setTalks(DEMO_TALKS),
    );
    return () => {
      stopped = true;
    };
  }, []);
  return talks;
}

export function AppShell({ children }: { children: ReactNode }) {
  const talks = useProgramme();
  if (!talks) return <p role="status" className="page">Loading the programme…</p>;
  return (
    <AppStateProvider talks={talks}>
      <Shell>{children}</Shell>
    </AppStateProvider>
  );
}
