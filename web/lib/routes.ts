/**
 * Route contract shared by Parts A, B and C. Part A implements plan, search, settings, talk and route.
 * Part B owns changes, alerts and report. Part C owns session join, organizer and presenter. Navigate with these helpers so a path
 * change happens in one place.
 */
export const ROUTES = {
  welcome: "/",
  setupNeeds: "/setup/needs",
  setupAlerts: "/setup/alerts",
  setupTopics: "/setup/topics",
  plan: "/plan",
  search: "/search",
  settings: "/settings",
  alerts: "/alerts",
  report: "/report",
  changes: "/changes",
  /** Part B, Screen 9: other talks that fit. Opened from any change alert. */
  options: "/changes/options",
  /** Part B, Screen 8 for one stored alert. */
  alert: (alertId: string) => `/alerts/${encodeURIComponent(alertId)}`,
  talk: (talkId: string) => `/talks/${encodeURIComponent(talkId)}`,
  route: (destinationId: string) => `/route/${encodeURIComponent(destinationId)}`,
  joinSession: (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}/join`,
  /** Part C, Screen 12: organizer dashboard (laptop). */
  organizer: "/organizer",
  /** Part C, Screen 13: presenter console for one talk (laptop). */
  presenter: (talkId: string) => `/presenter/${encodeURIComponent(talkId)}`,
} as const;
