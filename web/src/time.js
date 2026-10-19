export function zonedParts(date, tz) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const bag = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") bag[p.type] = p.value;
  }
  return bag;
}

export function localDate(date, tz) {
  const p = zonedParts(date, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function fmtTime(iso, tz) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function fmtDay(dateStr, tz) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(utc);
}

export function durationLabel(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function zonedWallTimeMs(dateStr, hour, minute, tz) {
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

export function dayWindow(dateStr, tz) {
  const prev = addDays(dateStr, -1);
  const startMs = zonedWallTimeMs(prev, 18, 0, tz);
  const endMs = zonedWallTimeMs(dateStr, 18, 0, tz);
  return { startMs, endMs };
}

export function toDatetimeLocal(iso, tz) {
  const p = zonedParts(new Date(iso), tz);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function fromDatetimeLocal(value, tz) {
  const [date, time] = value.split("T");
  const [h, m] = time.split(":").map(Number);
  return new Date(zonedWallTimeMs(date, h, m, tz)).toISOString();
}

export function snapIso(iso, step = 5) {
  const ms = step * 60_000;
  return new Date(Math.round(new Date(iso).getTime() / ms) * ms).toISOString();
}
