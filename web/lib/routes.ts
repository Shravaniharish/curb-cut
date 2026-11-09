/**
 * Route contract shared by Parts A, B and C. Part A implements plan, search, settings, talk and route.
 * Part B owns changes, alerts and report. Part C owns session join. Navigate with these helpers so a path
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
  talk: (talkId: string) => `/talks/${encodeURIComponent(talkId)}`,
  route: (destinationId: string) => `/route/${encodeURIComponent(destinationId)}`,
  joinSession: (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}/join`,
} as const;
