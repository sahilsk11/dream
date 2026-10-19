import type { Bindings, ScaleRow, ScaleSyncState, WeightRow } from "./types.ts";
import { localDate, nowIso, tzOf, zonedParts } from "./time.ts";
import {
  SCALE_X_MODEL,
  WyzeRateLimitError,
  getHeartRateRecords,
  getRecordRange,
  listScaleDevices,
  wyzeLogin,
  wyzeRefresh,
  type WyzeCreds,
  type WyzeDevice,
  type WyzeSession,
} from "./wyze.ts";

export const KG_TO_LB = 2.20462262185;
export const SYNC_STATE_ID = "wyze";
const ACCESS_TTL_MS = 47 * 60 * 60 * 1000;
const REFRESH_TTL_MS = 29 * 24 * 60 * 60 * 1000;
const LOGIN_BACKOFF_MS = 6 * 60 * 60 * 1000;
const NY_TZ = "America/New_York";

export function isNoonInNewYork(at: Date): boolean {
  return Number(zonedParts(at, NY_TZ).hour) === 12;
}

/** measure_ts seconds vs ms (>1e11 = ms), matching weighing-scale/app.py */
export function normalizeMeasureTs(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  const sec = n > 1e11 ? n / 1000 : n;
  return sec;
}

export function compactId(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function macMatches(recordMac: unknown, deviceMac: unknown): boolean {
  const a = compactId(recordMac);
  const b = compactId(deviceMac);
  if (!a || !b) return true;
  return a.endsWith(b) || b.endsWith(a);
}

export function measurementId(raw: Record<string, unknown>, tsSec: number): string {
  const id = raw.data_id ?? raw.id;
  if (id !== undefined && id !== null && String(id).length > 0) return String(id);
  const device = String(raw.device_id ?? raw.mac ?? "unknown");
  return `${device}:${tsSec}`;
}

export function num(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function impedanceOf(raw: Record<string, unknown>): string | null {
  if (Array.isArray(raw.impedance)) return JSON.stringify(raw.impedance);
  const parts = [raw.impedance1, raw.impedance2, raw.impedance3, raw.impedance4]
    .map(num)
    .filter((x): x is number => x !== null);
  if (parts.length) return JSON.stringify(parts);
  if (raw.impedance !== undefined && raw.impedance !== null) return String(raw.impedance);
  return null;
}

export type MappedScale = {
  id: string;
  measured_at: string;
  local_date: string;
  weight_kg: number | null;
  bmi: number | null;
  bmr: number | null;
  body_fat_pct: number | null;
  visceral_fat: number | null;
  body_water_pct: number | null;
  bone_mineral_kg: number | null;
  muscle_kg: number | null;
  protein_pct: number | null;
  metabolic_age: number | null;
  impedance: string | null;
  measure_type: number | null;
  device_id: string | null;
  measure_ts: number;
  body_type: number | null;
  age: number | null;
  gender: number | null;
  height: number | null;
  occupation: number | null;
  timezone: string | null;
  mac: string | null;
  family_member_id: string | null;
  user_id: string | null;
  heart_rate: number | null;
  raw_json: string;
  source: "scale";
  synced_at: string;
};

export function mapScaleRecord(
  raw: Record<string, unknown>,
  tz: string,
  syncedAt: string,
  heartRate?: number | null,
): MappedScale | null {
  const tsSec = normalizeMeasureTs(raw.measure_ts);
  if (tsSec === null) return null;
  const measured = new Date(tsSec * 1000);
  const weight = num(raw.weight);
  return {
    id: measurementId(raw, tsSec),
    measured_at: measured.toISOString(),
    local_date: localDate(measured, tz),
    weight_kg: weight,
    bmi: num(raw.bmi),
    bmr: num(raw.bmr),
    body_fat_pct: num(raw.body_fat),
    visceral_fat: num(raw.body_vfr),
    body_water_pct: num(raw.body_water),
    bone_mineral_kg: num(raw.bone_mineral),
    muscle_kg: num(raw.muscle),
    protein_pct: num(raw.protein),
    metabolic_age: num(raw.metabolic_age),
    impedance: impedanceOf(raw),
    measure_type: num(raw.measure_type),
    device_id: raw.device_id != null ? String(raw.device_id) : raw.mac != null ? String(raw.mac) : null,
    measure_ts: tsSec,
    body_type: num(raw.body_type),
    age: num(raw.age),
    gender: num(raw.gender),
    height: num(raw.height),
    occupation: num(raw.occupation),
    timezone: raw.timezone != null ? String(raw.timezone) : null,
    mac: raw.mac != null ? String(raw.mac) : null,
    family_member_id: raw.family_member_id != null ? String(raw.family_member_id) : null,
    user_id: raw.user_id != null ? String(raw.user_id) : null,
    heart_rate: heartRate ?? num(raw.heart_rate),
    raw_json: JSON.stringify(raw),
    source: "scale",
    synced_at: syncedAt,
  };
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * KG_TO_LB * 10) / 10;
}

export function filterRecords(
  rows: Record<string, unknown>[],
  opts: { startSec: number; endSec: number; device?: WyzeDevice | null },
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const raw of rows) {
    const ts = normalizeMeasureTs(raw.measure_ts);
    if (ts === null) continue;
    if (!(opts.startSec <= ts && ts < opts.endSec)) continue;
    if (opts.device) {
      const mac = raw.device_id ?? raw.mac;
      if (mac && !macMatches(mac, opts.device.mac)) continue;
    }
    const id = measurementId(raw, ts);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(raw);
  }
  return out;
}

const UPSERT_SQL = `INSERT INTO scale_measurements (
  id, measured_at, local_date, weight_kg, bmi, bmr, body_fat_pct, visceral_fat,
  body_water_pct, bone_mineral_kg, muscle_kg, protein_pct, metabolic_age, impedance,
  measure_type, device_id, measure_ts, body_type, age, gender, height, occupation,
  timezone, mac, family_member_id, user_id, heart_rate, raw_json, source, synced_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scale', ?)
ON CONFLICT(id) DO UPDATE SET
  measured_at=excluded.measured_at,
  local_date=excluded.local_date,
  weight_kg=excluded.weight_kg,
  bmi=excluded.bmi,
  bmr=excluded.bmr,
  body_fat_pct=excluded.body_fat_pct,
  visceral_fat=excluded.visceral_fat,
  body_water_pct=excluded.body_water_pct,
  bone_mineral_kg=excluded.bone_mineral_kg,
  muscle_kg=excluded.muscle_kg,
  protein_pct=excluded.protein_pct,
  metabolic_age=excluded.metabolic_age,
  impedance=excluded.impedance,
  measure_type=excluded.measure_type,
  device_id=excluded.device_id,
  measure_ts=excluded.measure_ts,
  body_type=excluded.body_type,
  age=excluded.age,
  gender=excluded.gender,
  height=excluded.height,
  occupation=excluded.occupation,
  timezone=excluded.timezone,
  mac=excluded.mac,
  family_member_id=excluded.family_member_id,
  user_id=excluded.user_id,
  heart_rate=COALESCE(excluded.heart_rate, scale_measurements.heart_rate),
  raw_json=excluded.raw_json,
  source='scale',
  synced_at=excluded.synced_at`;

export async function upsertScaleMeasurement(env: Bindings, row: MappedScale): Promise<void> {
  await env.DB.prepare(UPSERT_SQL)
    .bind(
      row.id,
      row.measured_at,
      row.local_date,
      row.weight_kg,
      row.bmi,
      row.bmr,
      row.body_fat_pct,
      row.visceral_fat,
      row.body_water_pct,
      row.bone_mineral_kg,
      row.muscle_kg,
      row.protein_pct,
      row.metabolic_age,
      row.impedance,
      row.measure_type,
      row.device_id,
      row.measure_ts,
      row.body_type,
      row.age,
      row.gender,
      row.height,
      row.occupation,
      row.timezone,
      row.mac,
      row.family_member_id,
      row.user_id,
      row.heart_rate,
      row.raw_json,
      row.synced_at,
    )
    .run();
}

export async function listScale(env: Bindings, opts: { from?: string; to?: string; limit?: number } = {}): Promise<ScaleRow[]> {
  const limit = opts.limit ?? 500;
  if (opts.from && opts.to) {
    const { results } = await env.DB.prepare(
      "SELECT * FROM scale_measurements WHERE measured_at >= ? AND measured_at <= ? ORDER BY measured_at DESC",
    )
      .bind(opts.from, opts.to)
      .all<ScaleRow>();
    return results ?? [];
  }
  const { results } = await env.DB.prepare(
    "SELECT * FROM scale_measurements ORDER BY measured_at DESC LIMIT ?",
  )
    .bind(limit)
    .all<ScaleRow>();
  return results ?? [];
}

export function publicScale(row: ScaleRow): ScaleRow & { lbs: number | null } {
  return {
    ...row,
    lbs: row.weight_kg != null ? kgToLbs(row.weight_kg) : null,
  };
}

export function scaleAsWeight(row: ScaleRow): WeightRow & { metrics?: ScaleRow } {
  const lbs = row.weight_kg != null ? kgToLbs(row.weight_kg) : 0;
  return {
    id: row.id,
    weighed_at: row.measured_at,
    local_date: row.local_date ?? row.measured_at.slice(0, 10),
    lbs,
    source: "scale",
    external_id: row.id,
    notes: null,
    is_example: 0,
    created_at: row.synced_at,
    updated_at: row.synced_at,
    metrics: row,
  };
}

export async function countScale(env: Bindings): Promise<number> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS c FROM scale_measurements").first<{ c: number }>();
  return row?.c ?? 0;
}

export async function latestMeasuredAt(env: Bindings): Promise<string | null> {
  const row = await env.DB.prepare(
    "SELECT measured_at FROM scale_measurements ORDER BY measured_at DESC LIMIT 1",
  ).first<{ measured_at: string }>();
  return row?.measured_at ?? null;
}

export async function getSyncState(env: Bindings): Promise<ScaleSyncState | null> {
  return env.DB.prepare("SELECT * FROM scale_sync_state WHERE id = ?")
    .bind(SYNC_STATE_ID)
    .first<ScaleSyncState>();
}

export function publicSyncState(row: ScaleSyncState | null): {
  last_sync_at: string | null;
  last_error: string | null;
  last_count: number | null;
  has_tokens: boolean;
} {
  return {
    last_sync_at: row?.last_sync_at ?? null,
    last_error: row?.last_error ?? null,
    last_count: row?.last_count ?? null,
    has_tokens: Boolean(row?.access_token && row?.refresh_token),
  };
}

async function saveSyncState(env: Bindings, patch: Partial<ScaleSyncState> & { id?: string }): Promise<void> {
  const existing = (await getSyncState(env)) ?? {
    id: SYNC_STATE_ID,
    access_token: null,
    refresh_token: null,
    user_id: null,
    phone_id: null,
    access_expires_at: null,
    refresh_expires_at: null,
    login_backoff_until: null,
    last_sync_at: null,
    last_error: null,
    last_count: null,
    updated_at: nowIso(),
  };
  const next: ScaleSyncState = {
    ...existing,
    ...patch,
    id: SYNC_STATE_ID,
    updated_at: nowIso(),
  };
  await env.DB.prepare(
    `INSERT INTO scale_sync_state (
      id, access_token, refresh_token, user_id, phone_id, access_expires_at, refresh_expires_at,
      login_backoff_until, last_sync_at, last_error, last_count, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      access_token=excluded.access_token,
      refresh_token=excluded.refresh_token,
      user_id=excluded.user_id,
      phone_id=excluded.phone_id,
      access_expires_at=excluded.access_expires_at,
      refresh_expires_at=excluded.refresh_expires_at,
      login_backoff_until=excluded.login_backoff_until,
      last_sync_at=excluded.last_sync_at,
      last_error=excluded.last_error,
      last_count=excluded.last_count,
      updated_at=excluded.updated_at`,
  )
    .bind(
      next.id,
      next.access_token,
      next.refresh_token,
      next.user_id,
      next.phone_id,
      next.access_expires_at,
      next.refresh_expires_at,
      next.login_backoff_until,
      next.last_sync_at,
      next.last_error,
      next.last_count,
      next.updated_at,
    )
    .run();
}

function wyzeCreds(env: Bindings): WyzeCreds | null {
  if (!env.WYZE_EMAIL || !env.WYZE_PASSWORD || !env.WYZE_KEY_ID || !env.WYZE_API_KEY) return null;
  return {
    email: env.WYZE_EMAIL,
    password: env.WYZE_PASSWORD,
    keyId: env.WYZE_KEY_ID,
    apiKey: env.WYZE_API_KEY,
    totpSecret: env.WYZE_TOTP_SECRET,
  };
}

function sessionFromState(row: ScaleSyncState): WyzeSession | null {
  if (!row.access_token || !row.refresh_token || !row.user_id || !row.phone_id) return null;
  return {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    user_id: row.user_id,
    phone_id: row.phone_id,
  };
}

function accessValid(row: ScaleSyncState, now: number): boolean {
  if (!row.access_token || !row.access_expires_at) return false;
  return Date.parse(row.access_expires_at) > now + 5 * 60_000;
}

async function persistSession(env: Bindings, session: WyzeSession, now: number): Promise<void> {
  await saveSyncState(env, {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user_id: session.user_id,
    phone_id: session.phone_id,
    access_expires_at: new Date(now + ACCESS_TTL_MS).toISOString(),
    refresh_expires_at: new Date(now + REFRESH_TTL_MS).toISOString(),
    login_backoff_until: null,
  });
}

/**
 * Refresh-first. Login at most once per invocation. Never retry login in a loop.
 */
export async function ensureWyzeSession(
  env: Bindings,
  creds: WyzeCreds,
  now = Date.now(),
): Promise<WyzeSession> {
  const state = (await getSyncState(env)) ?? null;
  const phoneId = state?.phone_id || crypto.randomUUID();
  let session = state ? sessionFromState(state) : null;

  if (session && accessValid(state!, now)) return session;

  if (session?.refresh_token) {
    try {
      session = await wyzeRefresh(session, now);
      await persistSession(env, session, now);
      return session;
    } catch (err) {
      if (err instanceof WyzeRateLimitError) {
        await saveSyncState(env, {
          login_backoff_until: new Date(now + LOGIN_BACKOFF_MS).toISOString(),
          last_error: err.message,
        });
        throw err;
      }
      // refresh failed — fall through to a single login
    }
  }

  const backoff = state?.login_backoff_until ? Date.parse(state.login_backoff_until) : 0;
  if (backoff > now) {
    throw new WyzeRateLimitError({
      error: "login_backoff",
      until: state?.login_backoff_until,
    });
  }

  try {
    session = await wyzeLogin(creds, phoneId, now);
    await persistSession(env, session, now);
    await saveSyncState(env, { login_backoff_until: null });
    return session;
  } catch (err) {
    if (err instanceof WyzeRateLimitError) {
      await saveSyncState(env, {
        login_backoff_until: new Date(now + LOGIN_BACKOFF_MS).toISOString(),
        last_error: err.message,
      });
    }
    throw err;
  }
}

function heartRateAt(records: Record<string, unknown>[], tsSec: number): number | null {
  for (const r of records) {
    const ts = normalizeMeasureTs(r.measure_ts ?? r.measure_time ?? r.ts);
    if (ts !== null && Math.abs(ts - tsSec) < 2) {
      return num(r.heart_rate ?? r.hr ?? r.value);
    }
  }
  return null;
}

async function pullWindow(
  session: WyzeSession,
  startMs: number,
  endMs: number,
): Promise<Record<string, unknown>[]> {
  const rows = await getRecordRange(session, {
    userId: session.user_id,
    startMs,
    endMs,
  });
  return rows as Record<string, unknown>[];
}

function windows(startMs: number, endMs: number): Array<[number, number]> {
  const span = 180 * 24 * 60 * 60 * 1000;
  const out: Array<[number, number]> = [];
  let cursor = startMs;
  while (cursor < endMs) {
    const next = Math.min(endMs, cursor + span);
    out.push([cursor, next]);
    cursor = next;
  }
  return out.length ? out : [[startMs, endMs]];
}

export type ScaleSyncResult = {
  ok: boolean;
  backfill: boolean;
  fetched: number;
  upserted: number;
  start: string;
  end: string;
  error?: string;
};

export async function runScaleSync(env: Bindings, now = Date.now()): Promise<ScaleSyncResult> {
  const creds = wyzeCreds(env);
  if (!creds) {
    const error = "Wyze secrets are not configured (WYZE_EMAIL, WYZE_PASSWORD, WYZE_KEY_ID, WYZE_API_KEY).";
    await saveSyncState(env, { last_error: error });
    return { ok: false, backfill: false, fetched: 0, upserted: 0, start: "", end: "", error };
  }

  const tz = tzOf(env.DREAM_TZ);
  const existing = await countScale(env);
  const backfill = existing === 0;
  const end = new Date(now);
  let start: Date;
  if (backfill) {
    start = new Date("2015-01-01T00:00:00.000Z");
  } else {
    const latest = await latestMeasuredAt(env);
    const from = latest ? Date.parse(latest) - 7 * 24 * 60 * 60 * 1000 : now - 7 * 24 * 60 * 60 * 1000;
    start = new Date(from);
  }

  try {
    const session = await ensureWyzeSession(env, creds, now);
    let device: WyzeDevice | null = null;
    try {
      const devices = await listScaleDevices(session, now);
      device = devices.find((d) => d.model === SCALE_X_MODEL) ?? devices[0] ?? null;
    } catch {
      device = null;
    }

    const collected: Record<string, unknown>[] = [];
    for (const [a, b] of windows(start.getTime(), end.getTime())) {
      const chunk = await pullWindow(session, a, b);
      collected.push(...chunk);
    }

    const startSec = start.getTime() / 1000;
    const endSec = end.getTime() / 1000;
    const filtered = filterRecords(collected, { startSec, endSec, device });

    let heart: Record<string, unknown>[] = [];
    try {
      heart = await getHeartRateRecords(session, { userId: session.user_id });
    } catch {
      heart = [];
    }

    const syncedAt = new Date(now).toISOString();
    let upserted = 0;
    for (const raw of filtered) {
      const ts = normalizeMeasureTs(raw.measure_ts);
      const mapped = mapScaleRecord(raw, tz, syncedAt, ts !== null ? heartRateAt(heart, ts) : null);
      if (!mapped) continue;
      await upsertScaleMeasurement(env, mapped);
      upserted += 1;
    }

    await saveSyncState(env, {
      last_sync_at: syncedAt,
      last_error: null,
      last_count: upserted,
    });
    return {
      ok: true,
      backfill,
      fetched: collected.length,
      upserted,
      start: start.toISOString(),
      end: end.toISOString(),
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await saveSyncState(env, { last_error: error });
    return {
      ok: false,
      backfill,
      fetched: 0,
      upserted: 0,
      start: start.toISOString(),
      end: end.toISOString(),
      error,
    };
  }
}

export async function maybeRunNoonScaleSync(env: Bindings, scheduledTime: number): Promise<ScaleSyncResult | { skipped: true; reason: string }> {
  if (!isNoonInNewYork(new Date(scheduledTime))) {
    return { skipped: true, reason: "not_noon_america_new_york" };
  }
  return runScaleSync(env, scheduledTime);
}
