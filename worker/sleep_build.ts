import {
  BATHROOM_MOTION,
  KITCHEN_MOTION,
  LEFT_PRESSURE,
  LIVING_MOTION,
  PERSON_SAHIL,
  RIGHT_PRESSURE,
  indexHaHistory,
  stateAt,
  type HaState,
} from "./ha.ts";
import { snapMinutes } from "./time.ts";

export const DEFAULT_PRESSURE_THRESHOLD = 330;
export const DEFAULT_LOOKBACK_HOURS = 36;
export const GAP_MERGE_MS = 20 * 60_000;
export const MIN_SESSION_MS = 20 * 60_000;
export const MOTION_SPLIT_MS = 10 * 60_000;

export type SleepInterval = {
  start: number;
  end: number;
};

export type BuiltSleepSession = {
  start: string;
  end: string;
  in_progress: boolean;
  external_id: string;
};

export function sleepExternalId(startIso: string): string {
  return `ha:sleep:${snapMinutes(startIso, 5)}`;
}

export function isInBed(left: string | null, right: string | null, threshold: number): boolean {
  const l = Number(left);
  const r = Number(right);
  return (Number.isFinite(l) && l > threshold) || (Number.isFinite(r) && r > threshold);
}

/** Away only when person.sahil is an explicit non-home zone. Missing/unknown → home. */
export function isHome(state: string | null): boolean {
  if (state == null) return true;
  const s = state.trim().toLowerCase();
  if (!s || s === "unavailable" || s === "unknown" || s === "none") return true;
  return s === "home";
}

export function isMotionOn(state: string | null): boolean {
  return state != null && state.trim().toLowerCase() === "on";
}

export type BuildSleepOpts = {
  startMs: number;
  endMs: number;
  threshold?: number;
  nowMs?: number;
};

export function buildSleepSessions(history: HaState[][], opts: BuildSleepOpts): BuiltSleepSession[] {
  const threshold = opts.threshold ?? DEFAULT_PRESSURE_THRESHOLD;
  const nowMs = opts.nowMs ?? opts.endMs;
  const endMs = Math.min(opts.endMs, nowMs);
  const startMs = opts.startMs;
  if (!(startMs < endMs)) return [];

  const byId = indexHaHistory(history);
  const times = collectTimes(byId, startMs, endMs);
  const occupancy = occupancyRuns(byId, times, threshold);
  const motion = motionRuns(byId, times);
  const split = splitByLongMotion(occupancy, motion, MOTION_SPLIT_MS);
  const merged = mergeShortGaps(split, motion, GAP_MERGE_MS, MOTION_SPLIT_MS);
  const kept = merged.filter((r) => r.end - r.start >= MIN_SESSION_MS);

  const stillInBed =
    isHome(stateAt(byId.get(PERSON_SAHIL), endMs)) &&
    isInBed(stateAt(byId.get(LEFT_PRESSURE), endMs), stateAt(byId.get(RIGHT_PRESSURE), endMs), threshold);

  return kept.map((r, i) => {
    const start = new Date(r.start).toISOString();
    const inProgress = stillInBed && r.end === endMs && i === kept.length - 1;
    return {
      start,
      end: new Date(r.end).toISOString(),
      in_progress: inProgress,
      external_id: sleepExternalId(start),
    };
  });
}

function collectTimes(byId: Map<string, HaState[]>, startMs: number, endMs: number): number[] {
  const set = new Set<number>([startMs, endMs]);
  for (const states of byId.values()) {
    for (const s of states) {
      const t = Date.parse(s.last_changed);
      if (Number.isFinite(t) && t > startMs && t < endMs) set.add(t);
    }
  }
  return [...set].sort((a, b) => a - b);
}

function occupancyRuns(byId: Map<string, HaState[]>, times: number[], threshold: number): SleepInterval[] {
  return booleanRuns(times, (t) => {
    const home = isHome(stateAt(byId.get(PERSON_SAHIL), t));
    if (!home) return false;
    return isInBed(stateAt(byId.get(LEFT_PRESSURE), t), stateAt(byId.get(RIGHT_PRESSURE), t), threshold);
  });
}

function motionRuns(byId: Map<string, HaState[]>, times: number[]): SleepInterval[] {
  return booleanRuns(times, (t) => {
    return (
      isMotionOn(stateAt(byId.get(LIVING_MOTION), t)) ||
      isMotionOn(stateAt(byId.get(KITCHEN_MOTION), t)) ||
      isMotionOn(stateAt(byId.get(BATHROOM_MOTION), t))
    );
  });
}

function booleanRuns(times: number[], at: (t: number) => boolean): SleepInterval[] {
  const out: SleepInterval[] = [];
  let cur: SleepInterval | null = null;
  for (let i = 0; i < times.length - 1; i++) {
    const a = times[i];
    const b = times[i + 1];
    if (at(a)) {
      if (cur) cur.end = b;
      else cur = { start: a, end: b };
    } else if (cur) {
      out.push(cur);
      cur = null;
    }
  }
  if (cur) out.push(cur);
  return out;
}

export function splitByLongMotion(
  occupancy: SleepInterval[],
  motion: SleepInterval[],
  longMs: number,
): SleepInterval[] {
  const cutters = motion.filter((m) => m.end - m.start >= longMs);
  const out: SleepInterval[] = [];
  for (const run of occupancy) {
    let cursor = run.start;
    for (const m of cutters) {
      if (m.end <= cursor || m.start >= run.end) continue;
      const cutStart = Math.max(m.start, cursor);
      if (cutStart > cursor) out.push({ start: cursor, end: cutStart });
      cursor = Math.min(run.end, Math.max(cursor, m.end));
    }
    if (cursor < run.end) out.push({ start: cursor, end: run.end });
  }
  return out;
}

export function mergeShortGaps(
  runs: SleepInterval[],
  motion: SleepInterval[],
  gapMs: number,
  longMotionMs: number,
): SleepInterval[] {
  if (!runs.length) return [];
  const out: SleepInterval[] = [{ ...runs[0] }];
  for (let i = 1; i < runs.length; i++) {
    const next = runs[i];
    const prev = out[out.length - 1];
    const gap = next.start - prev.end;
    const longMotionInGap = motion.some(
      (m) => m.end - m.start >= longMotionMs && overlaps(m.start, m.end, prev.end, next.start),
    );
    if (gap >= 0 && gap < gapMs && !longMotionInGap) {
      prev.end = next.end;
    } else {
      out.push({ ...next });
    }
  }
  return out;
}

function overlaps(a0: number, a1: number, b0: number, b1: number): boolean {
  return Math.min(a1, b1) > Math.max(a0, b0);
}
