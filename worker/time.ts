const DEFAULT_TZ = "America/Los_Angeles";

export function tzOf(envTz?: string): string {
  return envTz && envTz.length > 0 ? envTz : DEFAULT_TZ;
}

export function zonedParts(
  date: Date,
  tz: string,
): { year: string; month: string; day: string; hour: string; minute: string } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  return {
    year: bag.year,
    month: bag.month,
    day: bag.day,
    hour: bag.hour,
    minute: bag.minute,
  };
}

export function localDate(date: Date, tz: string): string {
  const p = zonedParts(date, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Sleep "day" is the local calendar date of the session end (wake / nap end). */
export function sleepDay(endIso: string, tz: string): string {
  return localDate(new Date(endIso), tz);
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d + days);
  const dt = new Date(utc);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Timeline window for a sleep day: 18:00 previous local day → 18:00 this day.
 * Overnight + morning + afternoon nap all sit on one strip.
 */
export function dayWindow(
  dateStr: string,
  tz: string,
): { startIso: string; endIso: string; startMs: number; endMs: number } {
  const startMs = zonedWallTimeMs(addDays(dateStr, -1), 18, 0, tz);
  const endMs = zonedWallTimeMs(dateStr, 18, 0, tz);
  return {
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString(),
    startMs,
    endMs,
  };
}

export function zonedWallTimeMs(
  dateStr: string,
  hour: number,
  minute: number,
  tz: string,
): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  let utcGuess = Date.UTC(y, m - 1, d, hour, minute, 0);
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(new Date(utcGuess), tz);
    const got = Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
      0,
    );
    const want = Date.UTC(y, m - 1, d, hour, minute, 0);
    utcGuess += want - got;
  }
  return utcGuess;
}

export function snapMinutes(iso: string, step = 5): string {
  const d = new Date(iso);
  const ms = step * 60_000;
  const snapped = Math.round(d.getTime() / ms) * ms;
  return new Date(snapped).toISOString();
}

export function durationMinutes(startIso: string, endIso: string): number {
  return Math.max(0, Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60_000));
}

export function overlapMs(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): number {
  const start = Math.max(Date.parse(aStart), Date.parse(bStart));
  const end = Math.min(Date.parse(aEnd), Date.parse(bEnd));
  return Math.max(0, end - start);
}

export function nowIso(): string {
  return new Date().toISOString();
}
