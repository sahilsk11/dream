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
export const MIN_SESSION_MS = 20 * 60_000;
/** Occupancy shorter than this does not end a session (bathroom blip). */
export const MOTION_PERSIST_MS = 3 * 60_000;

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

export function isPressureHigh(state: string | null, threshold: number): boolean {
  const n = Number(state);
  return Number.isFinite(n) && n > threshold;
}

export function isInBed(left: string | null, right: string | null, threshold: number): boolean {
  return isPressureHigh(left, threshold) || isPressureHigh(right, threshold);
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

/**
 * Pads read ~296 while he lies still and only spike >330 for a few seconds when
 * he moves. A stuck high value is one rising edge, not occupancy. Sessions are
 * quiet stretches (no sustained outside motion, phone home) bookended by spikes.
 */
export function buildSleepSessions(history: HaState[][], opts: BuildSleepOpts): BuiltSleepSession[] {
  const threshold = opts.threshold ?? DEFAULT_PRESSURE_THRESHOLD;
  const nowMs = opts.nowMs ?? opts.endMs;
  const endMs = Math.min(opts.endMs, nowMs);
  const startMs = opts.startMs;
  if (!(startMs < endMs)) return [];

  const byId = indexHaHistory(history);
  const times = collectTimes(byId, startMs, endMs);
  const spikes = mergeTimes([
    risingEdges(byId.get(LEFT_PRESSURE), threshold, startMs),
    risingEdges(byId.get(RIGHT_PRESSURE), threshold, startMs),
  ]).filter((t) => t > startMs && t < endMs && isHome(stateAt(byId.get(PERSON_SAHIL), t)));

  const motion = booleanRuns(times, (t) => {
    return (
      isMotionOn(stateAt(byId.get(LIVING_MOTION), t)) ||
      isMotionOn(stateAt(byId.get(KITCHEN_MOTION), t)) ||
      isMotionOn(stateAt(byId.get(BATHROOM_MOTION), t))
    );
  });
  const persistentMotion = motion.filter((m) => m.end - m.start >= MOTION_PERSIST_MS);
  const away = booleanRuns(times, (t) => !isHome(stateAt(byId.get(PERSON_SAHIL), t)));
  const blockers = mergeIntervals([...persistentMotion, ...away]);
  const quiet = gaps(blockers, startMs, endMs);

  const out: BuiltSleepSession[] = [];
  for (const gap of quiet) {
    if (gap.end - gap.start < MIN_SESSION_MS) continue;
    const inGap = spikes.filter((t) => t > gap.start && t < gap.end);
    if (!inGap.length) continue;
    const start = inGap[0];
    const lastSpike = inGap[inGap.length - 1];
    const open = gap.end === endMs;
    let end: number;
    let inProgress = false;
    if (open) {
      inProgress = true;
      end = endMs;
    } else if (lastSpike > start) {
      end = lastSpike;
    } else {
      end = gap.end;
    }
    if (end - start < MIN_SESSION_MS) continue;
    const startIso = new Date(start).toISOString();
    out.push({
      start: startIso,
      end: new Date(end).toISOString(),
      in_progress: inProgress,
      external_id: sleepExternalId(startIso),
    });
  }
  return out;
}

/** Rising edges above threshold after the window start. Stuck-high is not a new spike. */
export function risingEdges(states: HaState[] | undefined, threshold: number, startMs: number): number[] {
  if (!states?.length) return [];
  const out: number[] = [];
  let prevHigh = false;
  for (const s of states) {
    const t = Date.parse(s.last_changed);
    if (!Number.isFinite(t)) continue;
    const high = isPressureHigh(s.state, threshold);
    if (t <= startMs) {
      prevHigh = high;
      continue;
    }
    if (high && !prevHigh) out.push(t);
    if (s.state !== "unavailable" && s.state !== "unknown") prevHigh = high;
  }
  return out;
}

function mergeTimes(lists: number[][]): number[] {
  return [...new Set(lists.flat())].sort((a, b) => a - b);
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

export function mergeIntervals(runs: SleepInterval[]): SleepInterval[] {
  if (!runs.length) return [];
  const sorted = [...runs].sort((a, b) => a.start - b.start);
  const out: SleepInterval[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    const prev = out[out.length - 1];
    if (next.start <= prev.end) prev.end = Math.max(prev.end, next.end);
    else out.push({ ...next });
  }
  return out;
}

function gaps(blockers: SleepInterval[], startMs: number, endMs: number): SleepInterval[] {
  const out: SleepInterval[] = [];
  let cursor = startMs;
  for (const b of blockers) {
    if (b.end <= cursor) continue;
    const start = cursor;
    const end = Math.min(endMs, Math.max(cursor, b.start));
    if (end > start) out.push({ start, end });
    cursor = Math.max(cursor, b.end);
    if (cursor >= endMs) break;
  }
  if (cursor < endMs) out.push({ start: cursor, end: endMs });
  return out;
}
