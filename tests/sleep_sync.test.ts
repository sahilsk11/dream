import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Bindings, SleepRow } from "../worker/types.ts";
import {
  HA_SLEEP_ENTITIES,
  haHistoryUrl,
  indexHaHistory,
  type HaState,
} from "../worker/ha.ts";
import {
  buildSleepSessions,
  isHome,
  isInBed,
  sleepExternalId,
} from "../worker/sleep_build.ts";
import { ingestSleep } from "../worker/sleep.ts";
import { lookbackHours, runSleepSync } from "../worker/sleep_sync.ts";
import { maybeRunNoonSyncs, runNoonSyncs } from "../worker/cron.ts";
import { app } from "../worker/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(here, "fixtures/ha_sleep_history.json"), "utf8"),
) as { start: string; end: string; history: HaState[][] };

function st(entity_id: string, last_changed: string, state: string | number): HaState {
  return { entity_id, state: String(state), last_changed, last_updated: last_changed };
}

function pack(groups: HaState[][]): HaState[][] {
  return groups;
}

function mockSleepDb() {
  const sessions = new Map<string, SleepRow>();
  const state = new Map<string, Record<string, unknown>>();
  return {
    sessions,
    state,
    prepare(sql: string) {
      const q = sql.replace(/\s+/g, " ").trim();
      const exec = (...args: unknown[]) => ({
        async run() {
          if (/INSERT INTO sleep_sessions/i.test(q)) {
            const row = {
              id: String(args[0]),
              start_at: String(args[1]),
              end_at: String(args[2]),
              local_date: String(args[3]),
              source: args[4] as SleepRow["source"],
              confirmed: Number(args[5]),
              external_id: (args[6] as string) ?? null,
              notes: (args[7] as string) ?? null,
              is_example: Number(args[8] ?? 0),
              in_progress: Number(args[9] ?? 0),
              created_at: String(args[10]),
              updated_at: String(args[11]),
            };
            sessions.set(row.id, row);
            return { meta: { changes: 1 } };
          }
          if (/UPDATE sleep_sessions SET start_at/i.test(q)) {
            const id = String(args[args.length - 1]);
            const row = sessions.get(id);
            if (!row) return { meta: { changes: 0 } };
            if (q.includes("source = 'sensor'") && (row.source !== "sensor" || row.confirmed)) {
              return { meta: { changes: 0 } };
            }
            row.start_at = String(args[0]);
            row.end_at = String(args[1]);
            row.local_date = String(args[2]);
            row.in_progress = Number(args[3]);
            row.updated_at = String(args[4]);
            return { meta: { changes: 1 } };
          }
          if (/INSERT INTO sleep_sync_state/i.test(q)) {
            const row = {
              id: String(args[0]),
              last_sync_at: args[1],
              last_error: args[2],
              last_count: args[3],
              updated_at: args[4],
            };
            state.set(row.id, row);
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        },
        async first() {
          if (/sleep_sync_state/.test(q)) return state.get(String(args[0])) ?? null;
          return sessions.get(String(args[0])) ?? null;
        },
        async all() {
          return { results: [...sessions.values()] };
        },
      });
      return {
        bind: exec,
        run: () => exec().run(),
        first: () => exec().first(),
        all: () => exec().all(),
      };
    },
  };
}

function testEnv(extra: Record<string, unknown> = {}): Bindings {
  const db = mockSleepDb();
  return {
    DB: db as unknown as D1Database,
    ASSETS: { fetch: async () => new Response("ok") } as Fetcher,
    DREAM_API_TOKEN: "dev-token-not-for-prod",
    DREAM_TZ: "America/New_York",
    _db: db,
    ...extra,
  } as Bindings;
}

describe("HA history URL", () => {
  it("requests the pad + motion + person entities and never bed occupancy flags", () => {
    const url = haHistoryUrl(
      "https://ha.example/",
      new Date("2026-10-18T04:00:00.000Z"),
      new Date("2026-10-19T16:00:00.000Z"),
    );
    assert.match(url, /^https:\/\/ha\.example\/api\/history\/period\//);
    for (const id of HA_SLEEP_ENTITIES) {
      assert.ok(url.includes(encodeURIComponent(id)) || url.includes(id), id);
    }
    assert.equal(url.includes("bed_sensor_left_occupancy"), false);
    assert.equal(url.includes("bed_sensor_right_occupancy"), false);
  });
});

describe("pressure / presence helpers", () => {
  it("treats either pad above threshold as in bed", () => {
    assert.equal(isInBed("360", "296", 330), true);
    assert.equal(isInBed("296", "360", 330), true);
    assert.equal(isInBed("296", "296", 330), false);
    assert.equal(isInBed("330", "330", 330), false);
    assert.equal(isInBed("unavailable", "unknown", 330), false);
  });

  it("treats only explicit non-home person states as away", () => {
    assert.equal(isHome("home"), true);
    assert.equal(isHome("Home"), true);
    assert.equal(isHome(null), true);
    assert.equal(isHome("unavailable"), true);
    assert.equal(isHome("not_home"), false);
    assert.equal(isHome("Work"), false);
  });
});

describe("session building from fixture history", () => {
  const opts = {
    startMs: Date.parse(fixture.start),
    endMs: Date.parse(fixture.end),
  };

  it("keeps the nap and merged overnight, drops away-occupancy and short sits", () => {
    const sessions = buildSleepSessions(fixture.history, opts);
    assert.deepEqual(
      sessions.map((s) => ({ start: s.start, end: s.end, in_progress: s.in_progress })),
      [
        {
          start: "2026-10-18T18:10:00.000Z",
          end: "2026-10-18T18:52:00.000Z",
          in_progress: false,
        },
        {
          start: "2026-10-19T03:05:00.000Z",
          end: "2026-10-19T11:00:00.000Z",
          in_progress: false,
        },
      ],
    );
    assert.equal(sessions[1].external_id, sleepExternalId("2026-10-19T03:05:00.000Z"));
    assert.equal(indexHaHistory(fixture.history).has("binary_sensor.bed_sensor_left_occupancy"), false);
  });

  it("merges a <20 min bathroom gap with only 4 min of motion", () => {
    const night = buildSleepSessions(fixture.history, opts).find((s) => s.start.startsWith("2026-10-19"));
    assert.equal(night?.start, "2026-10-19T03:05:00.000Z");
    assert.equal(night?.end, "2026-10-19T11:00:00.000Z");
  });
});

describe("session building edge cases", () => {
  const start = "2026-10-19T00:00:00.000Z";
  const end = "2026-10-19T12:00:00.000Z";
  const opts = { startMs: Date.parse(start), endMs: Date.parse(end) };

  it("splits on a 20+ min out-of-bed gap", () => {
    const history = pack([
      [
        st("sensor.bed_sensor_left_illuminance", start, 360),
        st("sensor.bed_sensor_left_illuminance", "2026-10-19T04:00:00.000Z", 296),
        st("sensor.bed_sensor_left_illuminance", "2026-10-19T04:25:00.000Z", 360),
        st("sensor.bed_sensor_left_illuminance", "2026-10-19T08:00:00.000Z", 296),
      ],
      [st("sensor.bed_sensor_right_illuminance", start, 296)],
      [st("person.sahil", start, "home")],
    ]);
    const sessions = buildSleepSessions(history, opts);
    assert.deepEqual(
      sessions.map((s) => [s.start, s.end]),
      [
        ["2026-10-19T00:00:00.000Z", "2026-10-19T04:00:00.000Z"],
        ["2026-10-19T04:25:00.000Z", "2026-10-19T08:00:00.000Z"],
      ],
    );
  });

  it("splits when out-of-bedroom motion lasts more than 10 min even if the bed gap is short", () => {
    const history = pack([
      [
        st("sensor.bed_sensor_left_illuminance", start, 360),
        st("sensor.bed_sensor_left_illuminance", "2026-10-19T04:00:00.000Z", 296),
        st("sensor.bed_sensor_left_illuminance", "2026-10-19T04:12:00.000Z", 360),
        st("sensor.bed_sensor_left_illuminance", "2026-10-19T08:00:00.000Z", 296),
      ],
      [st("sensor.bed_sensor_right_illuminance", start, 296)],
      [
        st("binary_sensor.kitchen_cabinet_motion_occupancy", start, "off"),
        st("binary_sensor.kitchen_cabinet_motion_occupancy", "2026-10-19T04:00:00.000Z", "on"),
        st("binary_sensor.kitchen_cabinet_motion_occupancy", "2026-10-19T04:12:00.000Z", "off"),
      ],
      [st("person.sahil", start, "home")],
    ]);
    const sessions = buildSleepSessions(history, opts);
    assert.deepEqual(
      sessions.map((s) => [s.start, s.end]),
      [
        ["2026-10-19T00:00:00.000Z", "2026-10-19T04:00:00.000Z"],
        ["2026-10-19T04:12:00.000Z", "2026-10-19T08:00:00.000Z"],
      ],
    );
  });

  it("splits an in-bed stretch when motion stays on 10+ min with stuck pressure", () => {
    const history = pack([
      [st("sensor.bed_sensor_left_illuminance", start, 360), st("sensor.bed_sensor_left_illuminance", "2026-10-19T08:00:00.000Z", 296)],
      [st("sensor.bed_sensor_right_illuminance", start, 296)],
      [
        st("binary_sensor.living_room_motion_occupancy", start, "off"),
        st("binary_sensor.living_room_motion_occupancy", "2026-10-19T04:00:00.000Z", "on"),
        st("binary_sensor.living_room_motion_occupancy", "2026-10-19T04:15:00.000Z", "off"),
      ],
      [st("person.sahil", start, "home")],
    ]);
    const sessions = buildSleepSessions(history, opts);
    assert.deepEqual(
      sessions.map((s) => [s.start, s.end]),
      [
        ["2026-10-19T00:00:00.000Z", "2026-10-19T04:00:00.000Z"],
        ["2026-10-19T04:15:00.000Z", "2026-10-19T08:00:00.000Z"],
      ],
    );
  });

  it("drops stretches under 20 min", () => {
    const history = pack([
      [
        st("sensor.bed_sensor_left_illuminance", start, 296),
        st("sensor.bed_sensor_left_illuminance", "2026-10-19T04:00:00.000Z", 360),
        st("sensor.bed_sensor_left_illuminance", "2026-10-19T04:15:00.000Z", 296),
      ],
      [st("person.sahil", start, "home")],
    ]);
    assert.equal(buildSleepSessions(history, opts).length, 0);
  });

  it("ignores in-bed stretches while person.sahil is away", () => {
    const history = pack([
      [st("sensor.bed_sensor_left_illuminance", start, 360)],
      [st("person.sahil", start, "not_home")],
    ]);
    assert.equal(buildSleepSessions(history, opts).length, 0);
  });

  it("marks a session in_progress when still in bed at sync time", () => {
    const history = pack([
      [st("sensor.bed_sensor_left_illuminance", start, 360)],
      [st("person.sahil", start, "home")],
    ]);
    const sessions = buildSleepSessions(history, opts);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].in_progress, true);
    assert.equal(sessions[0].end, end);
    assert.equal(sessions[0].external_id, sleepExternalId(start));
  });
});

describe("reconciliation", () => {
  it("upserts by rounded start id and does not duplicate on rerun", async () => {
    const env = testEnv();
    const built = buildSleepSessions(fixture.history, {
      startMs: Date.parse(fixture.start),
      endMs: Date.parse(fixture.end),
    });
    const first = await ingestSleep(env, "America/New_York", built);
    assert.equal(first.inserted, 2);
    const second = await ingestSleep(env, "America/New_York", built);
    assert.equal(second.inserted, 0);
    assert.equal(second.skipped, 2);
    const db = (env as Bindings & { _db: ReturnType<typeof mockSleepDb> })._db;
    assert.equal(db.sessions.size, 2);
  });

  it("never overwrites an edited or confirmed session with the same external_id", async () => {
    const env = testEnv();
    const db = (env as Bindings & { _db: ReturnType<typeof mockSleepDb> })._db;
    const ext = sleepExternalId("2026-10-19T03:05:00.000Z");
    db.sessions.set("edited-night", {
      id: "edited-night",
      start_at: "2026-10-19T03:00:00.000Z",
      end_at: "2026-10-19T11:30:00.000Z",
      local_date: "2026-10-19",
      source: "edited",
      confirmed: 1,
      external_id: ext,
      notes: null,
      is_example: 0,
      in_progress: 0,
      created_at: "2026-10-19T12:00:00.000Z",
      updated_at: "2026-10-19T12:00:00.000Z",
    });
    const built = buildSleepSessions(fixture.history, {
      startMs: Date.parse(fixture.start),
      endMs: Date.parse(fixture.end),
    });
    const result = await ingestSleep(env, "America/New_York", built);
    assert.ok(result.decisions.some((d) => d.action === "skip" && d.reason === "edited_wins"));
    assert.equal(db.sessions.get("edited-night")?.end_at, "2026-10-19T11:30:00.000Z");
  });

  it("extends an in-progress sensor session then closes it with the real end", async () => {
    const env = testEnv();
    const db = (env as Bindings & { _db: ReturnType<typeof mockSleepDb> })._db;
    const start = "2026-10-19T03:05:00.000Z";
    const noon = "2026-10-19T16:00:00.000Z";
    const wake = "2026-10-19T11:00:00.000Z";
    const historyOpen = pack([
      [st("sensor.bed_sensor_left_illuminance", start, 360)],
      [st("person.sahil", start, "home")],
    ]);
    const open = buildSleepSessions(historyOpen, {
      startMs: Date.parse("2026-10-18T04:00:00.000Z"),
      endMs: Date.parse(noon),
    });
    assert.equal(open[0].in_progress, true);
    assert.equal(open[0].end, noon);
    const first = await ingestSleep(env, "America/New_York", open);
    assert.equal(first.inserted, 1);
    const row = [...db.sessions.values()][0];
    assert.equal(row.in_progress, 1);
    assert.equal(row.confirmed, 0);
    assert.equal(row.source, "sensor");

    const historyClosed = pack([
      [
        st("sensor.bed_sensor_left_illuminance", start, 360),
        st("sensor.bed_sensor_left_illuminance", wake, 296),
      ],
      [st("person.sahil", start, "home")],
    ]);
    const closed = buildSleepSessions(historyClosed, {
      startMs: Date.parse("2026-10-18T04:00:00.000Z"),
      endMs: Date.parse("2026-10-20T16:00:00.000Z"),
    });
    assert.equal(closed[0].in_progress, false);
    assert.equal(closed[0].end, wake);
    assert.equal(closed[0].external_id, open[0].external_id);
    const second = await ingestSleep(env, "America/New_York", closed);
    assert.equal(second.updated, 1);
    assert.equal(row.end_at, wake);
    assert.equal(row.in_progress, 0);
    assert.equal(db.sessions.size, 1);
  });
});

describe("runSleepSync + cron isolation", () => {
  it("records a not-configured error without calling HA", async () => {
    const env = testEnv();
    const result = await runSleepSync(env);
    assert.equal(result.ok, false);
    assert.match(result.error || "", /HA_URL/);
    const db = (env as Bindings & { _db: ReturnType<typeof mockSleepDb> })._db;
    assert.match(String(db.state.get("ha")?.last_error), /HA_URL/);
  });

  it("pulls fixture history, ingest sessions, and stores sync state", async () => {
    const env = testEnv({ HA_URL: "https://ha.example", HA_TOKEN: "token" });
    const orig = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      assert.match(url, /\/api\/history\/period\//);
      assert.equal(url.includes("bed_sensor_left_occupancy"), false);
      return new Response(JSON.stringify(fixture.history), { status: 200 });
    }) as typeof fetch;
    try {
      const result = await runSleepSync(env, {
        now: Date.parse(fixture.end),
        hours: 36,
      });
      assert.equal(result.ok, true);
      assert.equal(result.built, 2);
      assert.equal(result.inserted, 2);
      assert.equal(result.in_progress, 0);
    } finally {
      globalThis.fetch = orig;
    }
  });

  it("clamps hours and defaults to 36", () => {
    assert.equal(lookbackHours(undefined), 36);
    assert.equal(lookbackHours(48), 48);
    assert.equal(lookbackHours(24 * 30), 24 * 14);
    assert.equal(lookbackHours(0), 36);
  });

  it("skips the combined noon job when it is not noon in New York", async () => {
    const result = await maybeRunNoonSyncs(testEnv(), Date.parse("2026-07-15T17:00:00.000Z"));
    assert.deepEqual(result, { skipped: true, reason: "not_noon_america_new_york" });
  });

  it("runs sleep even when scale throws", async () => {
    const sleepCalls: number[] = [];
    const result = await runNoonSyncs(testEnv(), Date.parse("2026-07-15T16:00:00.000Z"), {
      scale: async () => {
        throw new Error("wyze down");
      },
      sleep: async () => {
        sleepCalls.push(1);
        return {
          ok: true,
          hours: 36,
          fetched: 0,
          built: 0,
          inserted: 0,
          updated: 0,
          skipped: 0,
          in_progress: 0,
          start: "",
          end: "",
        };
      },
    });
    assert.equal(result.scale.ok, false);
    if (!result.scale.ok) assert.match(result.scale.error || "", /wyze down/);
    assert.equal(result.sleep.ok, true);
    assert.equal(sleepCalls.length, 1);
  });
});

describe("POST /api/sync/sleep auth", () => {
  it("rejects missing credentials", async () => {
    const res = await app.request("https://dream.ultron.sh/api/sync/sleep", { method: "POST" }, testEnv());
    assert.equal(res.status, 401);
  });

  it("accepts the bearer token and 503s when HA is unconfigured", async () => {
    const res = await app.request(
      "https://dream.ultron.sh/api/sync/sleep",
      { method: "POST", headers: { authorization: "Bearer dev-token-not-for-prod" } },
      testEnv(),
    );
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.match(body.error, /not configured/i);
  });
});
