import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Bindings, FoodNutrients } from "./types.ts";
import {
  corsHeaders,
  isApiToken,
  json,
  requireAuth,
} from "./auth.ts";
import { localDate, nowIso, tzOf } from "./time.ts";
import {
  confirmSleep,
  deleteSleep,
  ingestSleep,
  insertSleep,
  listSleep,
  mergeSleep,
  publicSleep,
  splitSleep,
  updateSleep,
} from "./sleep.ts";
import {
  addFavorite,
  deleteFavorite,
  deleteFood,
  insertFood,
  listFavorites,
  listFood,
  recents,
  totals,
  updateFood,
} from "./food.ts";
import { lookupBarcode, parseWithLookup, scaleFood, searchUsda } from "./lookup.ts";
import { deleteWeight, ingestWeight, insertWeight, listWeight, updateWeight } from "./weight.ts";
import {
  getSyncState,
  listScale,
  publicScale,
  publicSyncState,
  runScaleSync,
} from "./scale.ts";
import { maybeRunNoonSyncs } from "./cron.ts";
import {
  getSleepSyncState,
  publicSleepSyncState,
  runSleepSync,
} from "./sleep_sync.ts";
import { maybeSeed, seedExample } from "./seed.ts";

type AppEnv = { Bindings: Bindings };

const app = new Hono<AppEnv>();

app.use("/api/*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(c.req.raw) });
  }
  await next();
  const h = corsHeaders(c.req.raw);
  for (const [k, v] of Object.entries(h)) c.header(k, v as string);
});

app.use(
  "/api/*",
  cors({
    origin: (origin) => origin || "*",
    credentials: true,
    allowHeaders: ["content-type", "authorization", "x-api-token"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  }),
);

app.get("/api/health", (c) =>
  json({
    ok: true,
    name: "dream",
    tz: tzOf(c.env.DREAM_TZ),
    demo: c.env.ALLOW_SEED === "true",
  }),
);

app.use("/api/*", async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (path === "/api/health") {
    return next();
  }
  const auth = await requireAuth(c.req.raw, c.env);
  if (!auth.ok) return auth.res;
  await maybeSeed(c.env);
  await next();
});

app.get("/api/me", async (c) => {
  const tz = tzOf(c.env.DREAM_TZ);
  const example = await c.env.DB.prepare(
    "SELECT COUNT(*) AS c FROM sleep_sessions WHERE is_example = 1",
  ).first<{ c: number }>();
  return json({
    ok: true,
    tz,
    today: localDate(new Date(), tz),
    example_data: (example?.c ?? 0) > 0,
    allow_seed: c.env.ALLOW_SEED === "true",
    via: (await isApiToken(c.req.raw, c.env)) ? "token" : "access",
  });
});

app.post("/api/setup/seed", async (c) => {
  if (c.env.ALLOW_SEED !== "true") return json({ error: "seed disabled" }, 403);
  const result = await seedExample(c.env);
  return json(result);
});

app.get("/api/sleep", async (c) => {
  const date = c.req.query("date");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const [rows, sleepSync] = await Promise.all([
    listSleep(c.env, { date, from, to }),
    getSleepSyncState(c.env),
  ]);
  return json({
    sessions: rows.map(publicSleep),
    sync: publicSleepSyncState(sleepSync, Boolean(c.env.HA_URL && c.env.HA_TOKEN)),
  });
});

app.post("/api/sleep", async (c) => {
  const tz = tzOf(c.env.DREAM_TZ);
  const body = (await c.req.json()) as {
    start_at: string;
    end_at: string;
    notes?: string;
  };
  try {
    const row = await insertSleep(c.env, tz, {
      start_at: new Date(body.start_at).toISOString(),
      end_at: new Date(body.end_at).toISOString(),
      source: "manual",
      confirmed: 1,
      notes: body.notes ?? null,
    });
    return json({ session: publicSleep(row) }, 201);
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
});

app.patch("/api/sleep/:id", async (c) => {
  const tz = tzOf(c.env.DREAM_TZ);
  const body = (await c.req.json()) as {
    start_at?: string;
    end_at?: string;
    notes?: string | null;
    confirmed?: number;
  };
  try {
    const row = await updateSleep(c.env, tz, c.req.param("id"), {
      start_at: body.start_at ? new Date(body.start_at).toISOString() : undefined,
      end_at: body.end_at ? new Date(body.end_at).toISOString() : undefined,
      notes: body.notes,
      confirmed: body.confirmed,
    });
    if (!row) return json({ error: "not found" }, 404);
    return json({ session: publicSleep(row) });
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
});

app.delete("/api/sleep/:id", async (c) => {
  const ok = await deleteSleep(c.env, c.req.param("id"));
  return json({ ok }, ok ? 200 : 404);
});

app.post("/api/sleep/:id/confirm", async (c) => {
  const row = await confirmSleep(c.env, c.req.param("id"));
  if (!row) return json({ error: "not found" }, 404);
  return json({ session: publicSleep(row) });
});

app.post("/api/sleep/:id/split", async (c) => {
  const tz = tzOf(c.env.DREAM_TZ);
  const body = (await c.req.json()) as { at: string };
  try {
    const result = await splitSleep(c.env, tz, c.req.param("id"), body.at);
    if (!result) return json({ error: "not found" }, 404);
    return json({
      sessions: [publicSleep(result.first), publicSleep(result.second)],
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
});

app.post("/api/sleep/merge", async (c) => {
  const tz = tzOf(c.env.DREAM_TZ);
  const body = (await c.req.json()) as { a: string; b: string };
  const row = await mergeSleep(c.env, tz, body.a, body.b);
  if (!row) return json({ error: "not found" }, 404);
  return json({ session: publicSleep(row) });
});

app.post("/api/ingest/sleep", async (c) => {
  const tz = tzOf(c.env.DREAM_TZ);
  const body = (await c.req.json()) as {
    intervals?: Array<{ start: string; end: string; external_id?: string; id?: string; in_progress?: boolean }>;
    start?: string;
    end?: string;
    external_id?: string;
    in_progress?: boolean;
  };
  const intervals = body.intervals?.length
    ? body.intervals.map((i) => ({
        start: i.start,
        end: i.end,
        external_id: i.external_id ?? i.id,
        in_progress: i.in_progress,
      }))
    : body.start && body.end
      ? [{ start: body.start, end: body.end, external_id: body.external_id, in_progress: body.in_progress }]
      : [];
  if (!intervals.length) return json({ error: "intervals required" }, 400);
  const result = await ingestSleep(c.env, tz, intervals);
  return json(result);
});

app.get("/api/food", async (c) => {
  const date = c.req.query("date");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const rows = await listFood(c.env, { date, from, to });
  return json({ entries: rows, totals: totals(rows) });
});

app.get("/api/food/recents", async (c) => json({ recents: await recents(c.env) }));
app.get("/api/food/favorites", async (c) => json({ favorites: await listFavorites(c.env) }));

app.get("/api/food/search", async (c) => {
  const q = c.req.query("q") || "";
  try {
    const matches = await searchUsda(c.env, q);
    return json({ matches });
  } catch (err) {
    return json({ error: (err as Error).message, matches: [] }, 502);
  }
});

app.get("/api/food/barcode/:code", async (c) => {
  const food = await lookupBarcode(c.env, c.req.param("code"));
  if (!food) return json({ error: "not found" }, 404);
  return json({ food });
});

app.post("/api/food/parse", async (c) => {
  const body = (await c.req.json()) as { text?: string };
  const text = String(body.text ?? "").trim();
  if (!text) return json({ error: "text required" }, 400);
  try {
    const result = await parseWithLookup(c.env, text);
    return json(result);
  } catch (err) {
    return json({ error: (err as Error).message }, 502);
  }
});

app.post("/api/food", async (c) => {
  const tz = tzOf(c.env.DREAM_TZ);
  const body = (await c.req.json()) as FoodNutrients & {
    eaten_at?: string;
    entries?: FoodNutrients[];
  };
  const eaten = body.eaten_at ?? nowIso();
  const list = body.entries?.length ? body.entries : [body];
  const entries = [];
  for (const item of list) {
    if (!item.name) continue;
    if (!item.source || !["usda", "off", "recent", "favorite"].includes(item.source)) {
      if (!item.fdc_id && !item.barcode && item.calories != null) {
        return json(
          { error: "calories must come from USDA or Open Food Facts, not a guess" },
          400,
        );
      }
    }
    const scaled = scaleFood(item, item.quantity, item.unit);
    entries.push(await insertFood(c.env, tz, scaled, eaten));
  }
  return json({ entries }, 201);
});

app.patch("/api/food/:id", async (c) => {
  const tz = tzOf(c.env.DREAM_TZ);
  const body = (await c.req.json()) as { quantity?: number; unit?: string; eaten_at?: string; name?: string };
  const row = await updateFood(c.env, tz, c.req.param("id"), body);
  if (!row) return json({ error: "not found" }, 404);
  return json({ entry: row });
});

app.delete("/api/food/:id", async (c) => {
  const ok = await deleteFood(c.env, c.req.param("id"));
  return json({ ok }, ok ? 200 : 404);
});

app.post("/api/food/favorites", async (c) => {
  const body = (await c.req.json()) as FoodNutrients;
  const row = await addFavorite(c.env, body);
  return json({ favorite: row }, 201);
});

app.delete("/api/food/favorites/:id", async (c) => {
  await deleteFavorite(c.env, c.req.param("id"));
  return json({ ok: true });
});

app.post("/api/food/scale", async (c) => {
  const body = (await c.req.json()) as { food: FoodNutrients; quantity: number; unit?: string };
  return json({ food: scaleFood(body.food, body.quantity, body.unit) });
});

app.get("/api/weight", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  const entries = await listWeight(c.env, { from, to });
  return json({ entries });
});

app.post("/api/weight", async (c) => {
  const tz = tzOf(c.env.DREAM_TZ);
  const body = (await c.req.json()) as { lbs: number; weighed_at?: string; notes?: string };
  try {
    const row = await insertWeight(c.env, tz, {
      lbs: Number(body.lbs),
      weighed_at: body.weighed_at,
      notes: body.notes ?? null,
      source: "manual",
    });
    return json({ entry: row }, 201);
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
});

app.patch("/api/weight/:id", async (c) => {
  const tz = tzOf(c.env.DREAM_TZ);
  const body = (await c.req.json()) as { lbs?: number; weighed_at?: string; notes?: string | null };
  try {
    const row = await updateWeight(c.env, tz, c.req.param("id"), body);
    if (!row) return json({ error: "not found" }, 404);
    return json({ entry: row });
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
});

app.delete("/api/weight/:id", async (c) => {
  const ok = await deleteWeight(c.env, c.req.param("id"));
  return json({ ok }, ok ? 200 : 404);
});

app.post("/api/ingest/weight", async (c) => {
  const tz = tzOf(c.env.DREAM_TZ);
  const body = (await c.req.json()) as {
    lbs?: number;
    kg?: number;
    weighed_at: string;
    external_id?: string;
    id?: string;
  };
  const lbs = body.lbs ?? (body.kg != null ? body.kg * 2.20462 : null);
  if (lbs == null) return json({ error: "lbs or kg required" }, 400);
  const result = await ingestWeight(c.env, tz, {
    lbs,
    weighed_at: body.weighed_at,
    external_id: body.external_id ?? body.id,
  });
  return json(result);
});

app.get("/api/scale", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  const [measurements, state] = await Promise.all([
    listScale(c.env, { from, to, limit: 500 }),
    getSyncState(c.env),
  ]);
  const latest = measurements[0] ? publicScale(measurements[0]) : null;
  const previous = measurements[1] ? publicScale(measurements[1]) : null;
  return json({
    measurements: measurements.map(publicScale),
    latest,
    previous,
    sync: publicSyncState(state),
  });
});

app.post("/api/sync/scale", async (c) => {
  const result = await runScaleSync(c.env);
  return json(result, result.ok ? 200 : result.error?.includes("not configured") ? 503 : 502);
});

app.post("/api/sync/sleep", async (c) => {
  let body: { hours?: number } = {};
  try {
    body = (await c.req.json()) as { hours?: number };
  } catch {
    body = {};
  }
  const hoursRaw = c.req.query("hours") ?? body.hours;
  const result = await runSleepSync(c.env, { hours: hoursRaw != null ? Number(hoursRaw) : undefined });
  return json(result, result.ok ? 200 : result.error?.includes("not configured") ? 503 : 502);
});

app.get("/api/export", async (c) => {
  const tz = tzOf(c.env.DREAM_TZ);
  const [sleep, food, weight, scale] = await Promise.all([
    listSleep(c.env, {}),
    listFood(c.env, {}),
    listWeight(c.env, { limit: 500 }),
    listScale(c.env, { limit: 2000 }),
  ]);
  return json({
    tz,
    exported_at: nowIso(),
    sleep: sleep.map(publicSleep),
    food,
    weight,
    scale: scale.map(publicScale),
  });
});

export { app };

export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return app.fetch(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(controller: ScheduledController, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(
      maybeRunNoonSyncs(env, controller.scheduledTime).then((result) => {
        if ("skipped" in result) return;
        if (!result.scale.ok) console.error("scale sync failed", result.scale.error);
        if (!result.sleep.ok) console.error("sleep sync failed", result.sleep.error);
      }),
    );
  },
};
