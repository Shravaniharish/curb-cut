"use client";

import type { ReactNode } from "react";
import { useApp } from "@/lib/store";
import { LoadingState } from "./ui";

/** Renders children once stored state has been read, so server and browser output match. */
export function WaitForState({ children, label }: { children: ReactNode; label?: string }) {
  const { ready } = useApp();
  return ready ? <>{children}</> : <LoadingState label={label ?? "Loading…"} />;
}
