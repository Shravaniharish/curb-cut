import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { AppStateProvider } from "@/lib/store";
import { defaultState } from "@/lib/preferences";
import { STATE_KEY } from "@/lib/storage";
import type { PersistedState } from "@/lib/types";

/** Seed stored state, then render inside the real provider so components read it exactly as in the browser. */
export function renderWithApp(ui: ReactElement, patch?: (s: PersistedState) => void) {
  if (patch) {
    const s = defaultState();
    patch(s);
    window.localStorage.setItem(STATE_KEY, JSON.stringify(s));
  }
  return render(<AppStateProvider>{ui}</AppStateProvider>);
}
