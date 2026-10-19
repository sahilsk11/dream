/** Home Assistant REST helpers for sleep sync. */

export const HA_SLEEP_ENTITIES = [
  "sensor.bed_sensor_left_illuminance",
  "sensor.bed_sensor_right_illuminance",
  "binary_sensor.living_room_motion_occupancy",
  "binary_sensor.kitchen_cabinet_motion_occupancy",
  "binary_sensor.bathroom_motion_occupancy",
  "person.sahil",
] as const;

export const LEFT_PRESSURE = HA_SLEEP_ENTITIES[0];
export const RIGHT_PRESSURE = HA_SLEEP_ENTITIES[1];
export const LIVING_MOTION = HA_SLEEP_ENTITIES[2];
export const KITCHEN_MOTION = HA_SLEEP_ENTITIES[3];
export const BATHROOM_MOTION = HA_SLEEP_ENTITIES[4];
export const PERSON_SAHIL = HA_SLEEP_ENTITIES[5];

export type HaState = {
  entity_id: string;
  state: string;
  last_changed: string;
  last_updated?: string;
  attributes?: Record<string, unknown>;
};

export function haHistoryUrl(baseUrl: string, start: Date, end: Date, entityIds: readonly string[] = HA_SLEEP_ENTITIES): string {
  const base = baseUrl.replace(/\/+$/, "");
  const qs = new URLSearchParams({
    filter_entity_id: entityIds.join(","),
    end_time: end.toISOString(),
  });
  return `${base}/api/history/period/${encodeURIComponent(start.toISOString())}?${qs}`;
}

export class HaHttpError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function fetchHaHistory(opts: {
  baseUrl: string;
  token: string;
  start: Date;
  end: Date;
  entityIds?: readonly string[];
}): Promise<HaState[][]> {
  const entityIds = opts.entityIds ?? HA_SLEEP_ENTITIES;
  const url = haHistoryUrl(opts.baseUrl, opts.start, opts.end, entityIds);
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${opts.token}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : res.statusText;
    throw new HaHttpError(`Home Assistant history failed (${res.status}): ${msg}`, res.status, data);
  }
  if (!Array.isArray(data)) return [];
  return data as HaState[][];
}

export function indexHaHistory(rows: HaState[][]): Map<string, HaState[]> {
  const map = new Map<string, HaState[]>();
  for (const group of rows) {
    if (!Array.isArray(group) || !group.length) continue;
    const id = group[0]?.entity_id;
    if (!id) continue;
    const sorted = [...group].sort(
      (a, b) => Date.parse(a.last_changed) - Date.parse(b.last_changed),
    );
    map.set(id, sorted);
  }
  return map;
}

/** Last-value-holds: state at t is the last sample with last_changed <= t. */
export function stateAt(states: HaState[] | undefined, t: number): string | null {
  if (!states?.length) return null;
  let value: string | null = null;
  for (const s of states) {
    const ts = Date.parse(s.last_changed);
    if (!Number.isFinite(ts)) continue;
    if (ts <= t) value = s.state;
    else break;
  }
  return value;
}
