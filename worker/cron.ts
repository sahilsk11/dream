import type { Bindings } from "./types.ts";
import { isNoonInNewYork, runScaleSync, type ScaleSyncResult } from "./scale.ts";
import { runSleepSync, type SleepSyncResult } from "./sleep_sync.ts";

export type NoonSyncResult =
  | { skipped: true; reason: string }
  | { scale: ScaleSyncResult | IsolatedFail; sleep: SleepSyncResult | IsolatedFail };

export type IsolatedFail = { ok: false; error: string };

async function isolate<T extends { ok: boolean }>(fn: () => Promise<T>): Promise<T | IsolatedFail> {
  try {
    return await fn();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Scale first, then sleep. Each is try/caught so a throw from one does not
 * skip the other. Both already return `{ ok: false }` on their own failures.
 */
export async function runNoonSyncs(
  env: Bindings,
  now: number,
  runners: {
    scale?: (env: Bindings, now: number) => Promise<ScaleSyncResult>;
    sleep?: (env: Bindings, opts: { now: number }) => Promise<SleepSyncResult>;
  } = {},
): Promise<{ scale: ScaleSyncResult | IsolatedFail; sleep: SleepSyncResult | IsolatedFail }> {
  const scaleFn = runners.scale ?? runScaleSync;
  const sleepFn = runners.sleep ?? runSleepSync;
  const scale = await isolate(() => scaleFn(env, now));
  const sleep = await isolate(() => sleepFn(env, { now }));
  return { scale, sleep };
}

export async function maybeRunNoonSyncs(env: Bindings, scheduledTime: number): Promise<NoonSyncResult> {
  if (!isNoonInNewYork(new Date(scheduledTime))) {
    return { skipped: true, reason: "not_noon_america_new_york" };
  }
  return runNoonSyncs(env, scheduledTime);
}
