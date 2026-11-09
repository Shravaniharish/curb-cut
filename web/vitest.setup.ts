import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { pathnameRef, push } from "./tests/nav-mock";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => pathnameRef.value,
  useParams: () => ({}),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  push.mockClear();
  pathnameRef.value = "/plan";
  document.documentElement.removeAttribute("style");
  for (const a of ["data-contrast", "data-font", "data-motion"]) document.documentElement.removeAttribute(a);
});
