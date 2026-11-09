"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/routes";

const ICONS: Record<string, string> = {
  plan: "M7 3v2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2V3h-2v2H9V3H7zm-2 6h14v10H5V9z",
  search: "M10 2a8 8 0 1 0 5 14.2l5 5 1.4-1.4-5-5A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z",
  alerts: "M12 2a6 6 0 0 0-6 6v4l-2 3v1h16v-1l-2-3V8a6 6 0 0 0-6-6zm-2 17a2 2 0 0 0 4 0h-4z",
  report: "M5 3v18h2v-7h11l-2-4 2-4H7V3H5z",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 5v-2l-2.1-.6a7 7 0 0 0-.7-1.7l1.1-1.9-1.4-1.4-1.9 1.1a7 7 0 0 0-1.7-.7L13 3h-2l-.6 2.1a7 7 0 0 0-1.7.7L6.8 4.7 5.4 6.1l1.1 1.9a7 7 0 0 0-.7 1.7L3.7 10.3v2l2.1.6c.2.6.4 1.2.7 1.7l-1.1 1.9 1.4 1.4 1.9-1.1c.5.3 1.1.5 1.7.7L11 21h2l.6-2.1c.6-.2 1.2-.4 1.7-.7l1.9 1.1 1.4-1.4-1.1-1.9c.3-.5.5-1.1.7-1.7L21 13z",
};

const ITEMS = [
  { key: "plan", label: "Plan", href: ROUTES.plan },
  { key: "search", label: "Search", href: ROUTES.search },
  { key: "alerts", label: "Alerts", href: ROUTES.alerts },
  { key: "report", label: "Report", href: ROUTES.report },
  { key: "settings", label: "Settings", href: ROUTES.settings },
];

/** Active tab: aria-current plus a top bar, bold text and underline, so colour is never the only signal. */
export function BottomNavigation() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Main">
      <ul>
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.key}>
              <Link href={item.href} aria-current={active ? "page" : undefined}>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
                  <path d={ICONS[item.key]} />
                </svg>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
