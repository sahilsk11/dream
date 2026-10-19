import type { Bindings, WeightRow, WeightSource } from "./types.ts";
import { localDate, nowIso } from "./time.ts";
import { listScale, scaleAsWeight } from "./scale.ts";

export async function listWeight(
  env: Bindings,
  opts: { from?: string; to?: string; limit?: number } = {},
): Promise<WeightRow[]> {
  const limit = opts.limit ?? 90;
  let manual: WeightRow[];
  if (opts.from && opts.to) {
    const { results } = await env.DB.prepare(
      "SELECT * FROM weight_entries WHERE weighed_at >= ? AND weighed_at <= ? ORDER BY weighed_at DESC",
    )
      .bind(opts.from, opts.to)
      .all<WeightRow>();
    manual = results ?? [];
  } else {
    const { results } = await env.DB.prepare(
      "SELECT * FROM weight_entries ORDER BY weighed_at DESC LIMIT ?",
    )
      .bind(limit)
      .all<WeightRow>();
    manual = results ?? [];
  }
  const scale = await listScale(env, { from: opts.from, to: opts.to, limit: opts.limit ?? 500 });
  const merged = [...manual, ...scale.map(scaleAsWeight)];
  merged.sort((a, b) => (a.weighed_at < b.weighed_at ? 1 : a.weighed_at > b.weighed_at ? -1 : 0));
  return merged.slice(0, opts.from && opts.to ? merged.length : limit);
}

export async function insertWeight(
  env: Bindings,
  tz: string,
  input: {
    lbs: number;
    weighed_at?: string;
    source?: WeightSource;
    external_id?: string | null;
    notes?: string | null;
    is_example?: number;
  },
): Promise<WeightRow> {
  if (!Number.isFinite(input.lbs) || input.lbs <= 0) {
    throw new Error("lbs must be a positive number");
  }
  const weighed = input.weighed_at ?? nowIso();
  const now = nowIso();
  const row: WeightRow = {
    id: crypto.randomUUID(),
    weighed_at: weighed,
    local_date: localDate(new Date(weighed), tz),
    lbs: Math.round(input.lbs * 10) / 10,
    source: input.source ?? "manual",
    external_id: input.external_id ?? null,
    notes: input.notes ?? null,
    is_example: input.is_example ?? 0,
    created_at: now,
    updated_at: now,
  };
  await env.DB.prepare(
    `INSERT INTO weight_entries
      (id, weighed_at, local_date, lbs, source, external_id, notes, is_example, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      row.id,
      row.weighed_at,
      row.local_date,
      row.lbs,
      row.source,
      row.external_id,
      row.notes,
      row.is_example,
      row.created_at,
      row.updated_at,
    )
    .run();
  return row;
}

export async function updateWeight(
  env: Bindings,
  tz: string,
  id: string,
  patch: { lbs?: number; weighed_at?: string; notes?: string | null },
): Promise<WeightRow | null> {
  const scaleHit = await env.DB.prepare("SELECT id FROM scale_measurements WHERE id = ?")
    .bind(id)
    .first<{ id: string }>();
  if (scaleHit) {
    throw new Error("scale readings are trusted and not edited here");
  }
  const existing = await env.DB.prepare("SELECT * FROM weight_entries WHERE id = ?")
    .bind(id)
    .first<WeightRow>();
  if (!existing) return null;
  const lbs = patch.lbs ?? existing.lbs;
  const weighed = patch.weighed_at ?? existing.weighed_at;
  const now = nowIso();
  const source: WeightSource = existing.source === "scale" ? "edited" : existing.source;
  await env.DB.prepare(
    `UPDATE weight_entries
     SET lbs = ?, weighed_at = ?, local_date = ?, notes = ?, source = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      Math.round(lbs * 10) / 10,
      weighed,
      localDate(new Date(weighed), tz),
      patch.notes === undefined ? existing.notes : patch.notes,
      source,
      now,
      id,
    )
    .run();
  return env.DB.prepare("SELECT * FROM weight_entries WHERE id = ?")
    .bind(id)
    .first<WeightRow>();
}

export async function deleteWeight(env: Bindings, id: string): Promise<boolean> {
  const scale = await env.DB.prepare("DELETE FROM scale_measurements WHERE id = ?")
    .bind(id)
    .run();
  if ((scale.meta.changes ?? 0) > 0) return true;
  const res = await env.DB.prepare("DELETE FROM weight_entries WHERE id = ?")
    .bind(id)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

export async function ingestWeight(
  env: Bindings,
  tz: string,
  reading: { lbs: number; weighed_at: string; external_id?: string },
): Promise<{ action: "insert" | "skip"; id?: string }> {
  const ext = reading.external_id ?? `scale:${reading.weighed_at}|${reading.lbs}`;
  const existing = await env.DB.prepare(
    "SELECT * FROM weight_entries WHERE external_id = ?",
  )
    .bind(ext)
    .first<WeightRow>();
  if (existing) {
    if (existing.source === "edited") return { action: "skip", id: existing.id };
    return { action: "skip", id: existing.id };
  }
  const row = await insertWeight(env, tz, {
    lbs: reading.lbs,
    weighed_at: reading.weighed_at,
    source: "scale",
    external_id: ext,
  });
  return { action: "insert", id: row.id };
}
