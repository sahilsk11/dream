import type { Bindings, SleepRow, SleepSource } from "./types.ts";
import {
  durationMinutes,
  nowIso,
  overlapMs,
  sleepDay,
  snapMinutes,
} from "./time.ts";

export type SleepPublic = SleepRow & { duration_min: number };

export function publicSleep(row: SleepRow): SleepPublic {
  return { ...row, duration_min: durationMinutes(row.start_at, row.end_at) };
}

export async function listSleep(
  env: Bindings,
  opts: { date?: string; from?: string; to?: string },
): Promise<SleepRow[]> {
  if (opts.date) {
    const { results } = await env.DB.prepare(
      "SELECT * FROM sleep_sessions WHERE local_date = ? ORDER BY start_at ASC",
    )
      .bind(opts.date)
      .all<SleepRow>();
    return results ?? [];
  }
  if (opts.from && opts.to) {
    const { results } = await env.DB.prepare(
      "SELECT * FROM sleep_sessions WHERE start_at < ? AND end_at > ? ORDER BY start_at ASC",
    )
      .bind(opts.to, opts.from)
      .all<SleepRow>();
    return results ?? [];
  }
  const { results } = await env.DB.prepare(
    "SELECT * FROM sleep_sessions ORDER BY start_at DESC LIMIT 200",
  ).all<SleepRow>();
  return results ?? [];
}

export async function getSleep(env: Bindings, id: string): Promise<SleepRow | null> {
  return (await env.DB.prepare("SELECT * FROM sleep_sessions WHERE id = ?")
    .bind(id)
    .first<SleepRow>()) ?? null;
}

export async function insertSleep(
  env: Bindings,
  tz: string,
  input: {
    start_at: string;
    end_at: string;
    source: SleepSource;
    confirmed: number;
    external_id?: string | null;
    notes?: string | null;
    is_example?: number;
    in_progress?: number;
  },
): Promise<SleepRow> {
  assertRange(input.start_at, input.end_at);
  const now = nowIso();
  const row: SleepRow = {
    id: crypto.randomUUID(),
    start_at: input.start_at,
    end_at: input.end_at,
    local_date: sleepDay(input.end_at, tz),
    source: input.source,
    confirmed: input.confirmed,
    external_id: input.external_id ?? null,
    notes: input.notes ?? null,
    is_example: input.is_example ?? 0,
    in_progress: input.in_progress ? 1 : 0,
    created_at: now,
    updated_at: now,
  };
  await env.DB.prepare(
    `INSERT INTO sleep_sessions
      (id, start_at, end_at, local_date, source, confirmed, external_id, notes, is_example, in_progress, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      row.id,
      row.start_at,
      row.end_at,
      row.local_date,
      row.source,
      row.confirmed,
      row.external_id,
      row.notes,
      row.is_example,
      row.in_progress,
      row.created_at,
      row.updated_at,
    )
    .run();
  return row;
}

export async function updateSleep(
  env: Bindings,
  tz: string,
  id: string,
  patch: {
    start_at?: string;
    end_at?: string;
    notes?: string | null;
    confirmed?: number;
    source?: SleepSource;
  },
): Promise<SleepRow | null> {
  const existing = await getSleep(env, id);
  if (!existing) return null;
  const start = patch.start_at ?? existing.start_at;
  const end = patch.end_at ?? existing.end_at;
  assertRange(start, end);
  const timesChanged =
    start !== existing.start_at || end !== existing.end_at;
  let source = patch.source ?? existing.source;
  let confirmed = patch.confirmed ?? existing.confirmed;
  let in_progress = existing.in_progress ? 1 : 0;
  if (timesChanged && existing.source === "sensor") {
    source = "edited";
    confirmed = 1;
    in_progress = 0;
  }
  if (timesChanged && existing.source === "manual") {
    source = "manual";
    confirmed = 1;
    in_progress = 0;
  }
  if (source === "edited") in_progress = 0;
  const now = nowIso();
  const local_date = sleepDay(end, tz);
  await env.DB.prepare(
    `UPDATE sleep_sessions
     SET start_at = ?, end_at = ?, local_date = ?, source = ?, confirmed = ?, notes = ?, in_progress = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      start,
      end,
      local_date,
      source,
      confirmed,
      patch.notes === undefined ? existing.notes : patch.notes,
      in_progress,
      now,
      id,
    )
    .run();
  return getSleep(env, id);
}

export async function deleteSleep(env: Bindings, id: string): Promise<boolean> {
  const res = await env.DB.prepare("DELETE FROM sleep_sessions WHERE id = ?")
    .bind(id)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

export async function confirmSleep(env: Bindings, id: string): Promise<SleepRow | null> {
  const existing = await getSleep(env, id);
  if (!existing) return null;
  const now = nowIso();
  await env.DB.prepare(
    "UPDATE sleep_sessions SET confirmed = 1, in_progress = 0, updated_at = ? WHERE id = ?",
  )
    .bind(now, id)
    .run();
  return getSleep(env, id);
}

export async function splitSleep(
  env: Bindings,
  tz: string,
  id: string,
  atIso: string,
): Promise<{ first: SleepRow; second: SleepRow } | null> {
  const existing = await getSleep(env, id);
  if (!existing) return null;
  const at = snapMinutes(atIso);
  const t = Date.parse(at);
  if (t <= Date.parse(existing.start_at) + 5 * 60_000 || t >= Date.parse(existing.end_at) - 5 * 60_000) {
    throw new Error("split time must be inside the session (5+ min on each side)");
  }
  const now = nowIso();
  const firstEnd = at;
  const secondStart = at;
  await env.DB.prepare(
    `UPDATE sleep_sessions
     SET end_at = ?, local_date = ?, source = 'edited', confirmed = 1, in_progress = 0, updated_at = ?
     WHERE id = ?`,
  )
    .bind(firstEnd, sleepDay(firstEnd, tz), now, id)
    .run();
  const second = await insertSleep(env, tz, {
    start_at: secondStart,
    end_at: existing.end_at,
    source: "edited",
    confirmed: 1,
    notes: existing.notes,
    is_example: existing.is_example,
  });
  const first = (await getSleep(env, id))!;
  return { first, second };
}

export async function mergeSleep(
  env: Bindings,
  tz: string,
  idA: string,
  idB: string,
): Promise<SleepRow | null> {
  const a = await getSleep(env, idA);
  const b = await getSleep(env, idB);
  if (!a || !b) return null;
  const start = Date.parse(a.start_at) <= Date.parse(b.start_at) ? a.start_at : b.start_at;
  const end = Date.parse(a.end_at) >= Date.parse(b.end_at) ? a.end_at : b.end_at;
  const keep = a;
  const drop = b;
  await env.DB.prepare("DELETE FROM sleep_sessions WHERE id = ?").bind(drop.id).run();
  return updateSleep(env, tz, keep.id, {
    start_at: start,
    end_at: end,
    source: "edited",
    confirmed: 1,
  });
}

export type IngestInterval = {
  start: string;
  end: string;
  external_id?: string;
  in_progress?: boolean;
};

export type IngestDecision =
  | { action: "insert"; interval: IngestInterval }
  | { action: "update"; id: string; interval: IngestInterval }
  | { action: "skip"; reason: string; id?: string; interval: IngestInterval };

export function decideSleepIngest(
  existing: SleepRow[],
  interval: IngestInterval,
  claimed?: Set<string>,
): IngestDecision {
  const ext = interval.external_id;
  if (ext) {
    const match = existing.find((s) => s.external_id === ext);
    if (match) {
      if (match.source === "edited" || (match.source === "manual" && match.confirmed)) {
        return { action: "skip", reason: "edited_wins", id: match.id, interval };
      }
      if (match.confirmed) {
        return { action: "skip", reason: "confirmed_sensor", id: match.id, interval };
      }
      if (match.start_at === interval.start && match.end_at === interval.end) {
        return { action: "skip", reason: "unchanged", id: match.id, interval };
      }
      return { action: "update", id: match.id, interval };
    }
  }
  const sensorDur = Math.max(1, Date.parse(interval.end) - Date.parse(interval.start));
  for (const row of existing) {
    if (row.source === "sensor" && !row.confirmed) continue;
    const ov = overlapMs(row.start_at, row.end_at, interval.start, interval.end);
    if (ov / sensorDur >= 0.5) {
      return { action: "skip", reason: "edited_wins", id: row.id, interval };
    }
  }
  const same = existing.find(
    (s) => s.start_at === interval.start && s.end_at === interval.end,
  );
  if (same) {
    return { action: "skip", reason: "duplicate_times", id: same.id, interval };
  }
  // Same sleep already stored as an unconfirmed sensor row under another id
  // (e.g. a manual backfill, or a start that drifted across a 5-min bucket):
  // reconcile into that row instead of inserting a duplicate.
  let best: { row: SleepRow; ov: number } | null = null;
  for (const row of existing) {
    if (row.source !== "sensor" || row.confirmed) continue;
    if (claimed?.has(row.id)) continue;
    const ov = overlapMs(row.start_at, row.end_at, interval.start, interval.end);
    const rowDur = Math.max(1, Date.parse(row.end_at) - Date.parse(row.start_at));
    if (ov / Math.min(sensorDur, rowDur) >= 0.5 && (!best || ov > best.ov)) best = { row, ov };
  }
  if (best) {
    if (best.row.start_at === interval.start && best.row.end_at === interval.end) {
      return { action: "skip", reason: "unchanged", id: best.row.id, interval };
    }
    return { action: "update", id: best.row.id, interval };
  }
  return { action: "insert", interval };
}

export async function ingestSleep(
  env: Bindings,
  tz: string,
  intervals: IngestInterval[],
): Promise<{ inserted: number; updated: number; skipped: number; decisions: IngestDecision[] }> {
  const { results: all } = await env.DB.prepare(
    "SELECT * FROM sleep_sessions",
  ).all<SleepRow>();
  const existing = all ?? [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const decisions: IngestDecision[] = [];
  const claimed = new Set<string>();
  for (const raw of intervals) {
    const interval: IngestInterval = {
      start: new Date(raw.start).toISOString(),
      end: new Date(raw.end).toISOString(),
      external_id: raw.external_id ?? `ha:${raw.start}|${raw.end}`,
      in_progress: Boolean(raw.in_progress),
    };
    if (Date.parse(interval.end) <= Date.parse(interval.start)) {
      skipped += 1;
      decisions.push({ action: "skip", reason: "bad_range", interval });
      continue;
    }
    const decision = decideSleepIngest(existing, interval, claimed);
    decisions.push(decision);
    if ("id" in decision && decision.id) claimed.add(decision.id);
    if (decision.action === "skip") {
      skipped += 1;
      continue;
    }
    if (decision.action === "update") {
      const now = nowIso();
      const inProgress = interval.in_progress ? 1 : 0;
      await env.DB.prepare(
        `UPDATE sleep_sessions
         SET start_at = ?, end_at = ?, local_date = ?, in_progress = ?, updated_at = ?, external_id = ?
         WHERE id = ? AND source = 'sensor' AND confirmed = 0`,
      )
        .bind(
          interval.start,
          interval.end,
          sleepDay(interval.end, tz),
          inProgress,
          now,
          interval.external_id ?? null,
          decision.id,
        )
        .run();
      updated += 1;
      const idx = existing.findIndex((s) => s.id === decision.id);
      if (idx >= 0) {
        existing[idx] = {
          ...existing[idx],
          start_at: interval.start,
          end_at: interval.end,
          local_date: sleepDay(interval.end, tz),
          in_progress: inProgress,
          external_id: interval.external_id ?? existing[idx].external_id,
        };
      }
      continue;
    }
    const row = await insertSleep(env, tz, {
      start_at: interval.start,
      end_at: interval.end,
      source: "sensor",
      confirmed: 0,
      external_id: interval.external_id,
      notes: null,
      in_progress: interval.in_progress ? 1 : 0,
    });
    existing.push(row);
    inserted += 1;
  }
  return { inserted, updated, skipped, decisions };
}

function assertRange(start: string, end: string) {
  if (!start || !end || Date.parse(end) <= Date.parse(start)) {
    throw new Error("end must be after start");
  }
}
