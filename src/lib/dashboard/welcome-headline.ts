/**
 * Base key; use {@link dashboardLastVisitStorageKey} for reads/writes.
 * Value is the ISO time the user last **disengaged** (tab hidden, page hide, or leaving the dashboard route), not session start.
 */
export const DASHBOARD_LAST_VISIT_KEY = "spendda_dashboard_last_visit_iso";

export function dashboardLastVisitStorageKey(clientId: string | null | undefined): string {
  const id = clientId?.trim();
  return id ? `${DASHBOARD_LAST_VISIT_KEY}:${id}` : DASHBOARD_LAST_VISIT_KEY;
}

const PREFIX = "Welcome back — ";

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days between `later` and `earlier` (local midnight), non-negative. */
export function calendarDaysBetween(later: Date, earlier: Date): number {
  return Math.max(0, Math.round((startOfLocalDay(later) - startOfLocalDay(earlier)) / 86_400_000));
}

function monthKey(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth();
}

function formatSinceSession(d: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

/**
 * Executive hero line for the finance dashboard. `lastVisit` is the previous
 * session timestamp (from localStorage); `null` means first tracked visit.
 */
export function buildDashboardWelcomeHeadline(now: Date, lastVisit: Date | null): string {
  if (!lastVisit || Number.isNaN(lastVisit.getTime())) {
    return `${PREFIX}here's your latest overview.`;
  }

  if (lastVisit.getTime() > now.getTime() + 60_000) {
    return `${PREFIX}here's your latest update.`;
  }

  if (monthKey(now) > monthKey(lastVisit)) {
    return `${PREFIX}here's what moved since last month close.`;
  }

  const daysAway = calendarDaysBetween(now, lastVisit);
  if (daysAway >= 7) {
    return `${PREFIX}here's what moved this week.`;
  }

  if (daysAway === 1) {
    return `${PREFIX}here's what moved since yesterday.`;
  }

  if (now.getDay() === 1 /* Monday */ && daysAway >= 2 && daysAway < 7) {
    return `${PREFIX}here's what moved since Friday.`;
  }

  if (daysAway >= 2 && daysAway < 7) {
    return `${PREFIX}here's what moved since ${formatSinceSession(lastVisit)}.`;
  }

  return `${PREFIX}here's your latest update.`;
}
