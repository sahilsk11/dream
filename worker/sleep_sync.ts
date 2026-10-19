import type { Bindings, SleepSyncState } from "./types.ts";
import { HA_SLEEP_ENTITIES, fetchHaHistory } from "./ha.ts";
import {
  DEFAULT_LOOKBACK_HOURS,
  DEFAULT_PRESSURE_THRESHOLD,
  buildSleepSessions,
} from "./sleep_build.ts";
import { ingestSleep } from "./sleep.ts";
import { nowIso, tzOf } from "./time.ts";

export const SLEEP_SYNC_STATE_ID = "ha";

export type SleepSyncResult = {
  ok: boolean;
  hours: number;
  fetched: number;
  built: number;
  inserted: number;
  updated: number;
  skipped: number;
  in_progress: number;
  start: string;
  end: string;
  error?: string;
};

export function pressureThreshold(env: Bindings): number {
  const n = Number(env.SLEEP_PRESSURE_THRESHOLD);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PRESSURE_THRESHOLD;
}

export function lookbackHours(raw: unknown, fallback = DEFAULT_LOOKBACK_HOURS): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, 24 * 14);
}

export async function getSleepSyncState(env: Bindings): Promise<SleepSyncState | null> {
  return env.DB.prepare("SELECT * FROM sleep_sync_state WHERE id = ?")
    .bind(SLEEP_SYNC_STATE_ID)
    .first<SleepSyncState>();
}

export function publicSleepSyncState(
  row: SleepSyncState | null,
  configured: boolean,
): {
  last_sync_at: string | null;
  last_error: string | null;
  last_count: number | null;
  configured: boolean;
} {
  return {
    last_sync_at: row?.last_sync_at ?? null,
    last_error: row?.last_error ?? null,
    last_count: row?.last_count ?? null,
    configured,
  };
}

async function saveSleepSyncState(env: Bindings, patch: Partial<SleepSyncState>): Promise<void> {
  const existing = (await getSleepSyncState(env)) ?? {
    id: SLEEP_SYNC_STATE_ID,
    last_sync_at: null,
    last_error: null,
    last_count: null,
    updated_at: nowIso(),
  };
  const next: SleepSyncState = {
    ...existing,
    ...patch,
    id: SLEEP_SYNC_STATE_ID,
    updated_at: nowIso(),
  };
  await env.DB.prepare(
    `INSERT INTO sleep_sync_state (id, last_sync_at, last_error, last_count, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       last_sync_at=excluded.last_sync_at,
       last_error=excluded.last_error,
       last_count=excluded.last_count,
       updated_at=excluded.updated_at`,
  )
    .bind(next.id, next.last_sync_at, next.last_error, next.last_count, next.updated_at)
    .run();
}

export async function runSleepSync(
  env: Bindings,
  opts: { now?: number; hours?: number } = {},
): Promise<SleepSyncResult> {
  const now = opts.now ?? Date.now();
  const hours = lookbackHours(opts.hours);
  const end = new Date(now);
  const start = new Date(now - hours * 60 * 60 * 1000);
  const empty: SleepSyncResult = {
    ok: false,
    hours,
    fetched: 0,
    built: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    in_progress: 0,
    start: start.toISOString(),
    end: end.toISOString(),
  };

  if (!env.HA_URL || !env.HA_TOKEN) {
    const error = "Home Assistant secrets are not configured (HA_URL, HA_TOKEN).";
    await saveSleepSyncState(env, { last_error: error });
    return { ...empty, error };
  }

  try {
    const history = await fetchHaHistory({
      baseUrl: env.HA_URL,
      token: env.HA_TOKEN,
      start,
      end,
      entityIds: HA_SLEEP_ENTITIES,
    });
    const fetched = history.reduce((n, g) => n + g.length, 0);
    const built = buildSleepSessions(history, {
      startMs: start.getTime(),
      endMs: end.getTime(),
      nowMs: now,
      threshold: pressureThreshold(env),
    });
    const tz = tzOf(env.DREAM_TZ);
    const result = await ingestSleep(
      env,
      tz,
      built.map((s) => ({
        start: s.start,
        end: s.end,
        external_id: s.external_id,
        in_progress: s.in_progress,
      })),
    );
    const inProgress = built.filter((s) => s.in_progress).length;
    await saveSleepSyncState(env, {
      last_sync_at: new Date(now).toISOString(),
      last_error: null,
      last_count: result.inserted + result.updated,
    });
    return {
      ok: true,
      hours,
      fetched,
      built: built.length,
      inserted: result.inserted,
      updated: result.updated,
      skipped: result.skipped,
      in_progress: inProgress,
      start: start.toISOString(),
      end: end.toISOString(),
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await saveSleepSyncState(env, { last_error: error });
    return { ...empty, error };
  }
}
