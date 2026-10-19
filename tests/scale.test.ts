import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hmacMd5Hex, md5Hex } from "../worker/md5.ts";
import {
  generateDynamicSignature,
  requestId,
  sortedQuery,
  tripleMd5,
  WYZE_SIGNING_SECRET,
} from "../worker/wyze.ts";
import {
  compactId,
  filterRecords,
  isNoonInNewYork,
  macMatches,
  mapScaleRecord,
  maybeRunNoonScaleSync,
  measurementId,
  normalizeMeasureTs,
  upsertScaleMeasurement,
} from "../worker/scale.ts";
import { app } from "../worker/index.ts";
import type { Bindings } from "../worker/types.ts";

describe("md5 / wyze-sdk signing goldens", () => {
  it("matches known MD5 vectors", () => {
    assert.equal(md5Hex(""), "d41d8cd98f00b204e9800998ecf8427e");
    assert.equal(md5Hex("abc"), "900150983cd24fb0d6963f7d28e17f72");
  });

  it("triple-md5 matches wyze-sdk RequestVerifier.md5_string x3", () => {
    // Computed with hashlib.md5 from wyze-sdk's RequestVerifier.md5_string
    assert.equal(tripleMd5("hunter2"), "7f5f74be86aa53a4abffeeeb0a3c2750");
    assert.equal(tripleMd5("päss"), "1e3fce30adcce086e86a413b2a4b5959");
  });

  it("sorted query + HMAC-MD5 signature2 match the Python SDK", () => {
    const params = {
      family_member_id: "user123",
      start_time: "1600000000000",
      end_time: "1690000000000",
      forward: "0",
      nonce: 1690000000001,
    };
    const body = sortedQuery(params);
    assert.equal(
      body,
      "end_time=1690000000000&family_member_id=user123&forward=0&nonce=1690000000001&start_time=1600000000000",
    );
    const sig = generateDynamicSignature("test-access-token", body, WYZE_SIGNING_SECRET);
    assert.equal(sig, "91c92085c631ac86d961b3e2bdf94c12");
    assert.equal(requestId(1690000000001), "c23c282c0df74c3aee00c18921991c93");
    assert.equal(
      hmacMd5Hex("1d7f1a758ef036a1e70d7bc5b2fbdc1d", body),
      "91c92085c631ac86d961b3e2bdf94c12",
    );
  });

  it("signs a compact JSON POST body the same way as generate_dynamic_signature", () => {
    const post = '{"nonce":"1690000000001","family_member_id":"user123"}';
    assert.equal(generateDynamicSignature("test-access-token", post), "2ec1024d7ee2df685c7f338b3266a3a4");
  });
});

describe("measure_ts normalization", () => {
  it("treats values >1e11 as milliseconds", () => {
    assert.equal(normalizeMeasureTs(1_700_000_000), 1_700_000_000);
    assert.equal(normalizeMeasureTs(1_700_000_000_000), 1_700_000_000);
    assert.equal(normalizeMeasureTs("1700000000000"), 1_700_000_000);
    assert.equal(normalizeMeasureTs(0), null);
    assert.equal(normalizeMeasureTs(null), null);
  });
});

describe("mac matching", () => {
  it("strips separators and matches prefixed device ids", () => {
    assert.equal(compactId("WL_SC3.AA:BB:CC:DD:EE:FF"), "wlsc3aabbccddeeff");
    assert.equal(macMatches("AA:BB:CC:DD:EE:FF", "WL_SC3AABBCCDDEEFF"), true);
    assert.equal(macMatches("aa:bb:cc:dd:ee:ff", "WL_SC3.aabbccddeeff"), true);
    assert.equal(macMatches("11:22:33:44:55:66", "WL_SC3AABBCCDDEEFF"), false);
    assert.equal(macMatches("", "WL_SC3AABBCCDDEEFF"), true);
  });
});

describe("record mapping + local filter", () => {
  it("keys by data_id and falls back to device_id+measure_ts", () => {
    assert.equal(measurementId({ data_id: "abc" }, 170), "abc");
    assert.equal(measurementId({ device_id: "mac1" }, 170), "mac1:170");
  });

  it("drops out-of-range and mismatched-mac rows, then dedupes", () => {
    const rows = [
      { data_id: "a", measure_ts: 1_700_000_000, device_id: "AA:BB:CC:DD:EE:FF", weight: 80 },
      { data_id: "b", measure_ts: 1_600_000_000, device_id: "AA:BB:CC:DD:EE:FF", weight: 81 },
      { data_id: "c", measure_ts: 1_700_000_100, device_id: "11:22:33:44:55:66", weight: 82 },
      { data_id: "a", measure_ts: 1_700_000_000, device_id: "AA:BB:CC:DD:EE:FF", weight: 80 },
      { data_id: "d", measure_ts: 1_700_000_000_000, device_id: "AABBCCDDEEFF", weight: 79.5 },
    ];
    const kept = filterRecords(rows, {
      startSec: 1_650_000_000,
      endSec: 1_800_000_000,
      device: { mac: "WL_SC3.AABBCCDDEEFF", model: "WL_SC3" },
    });
    assert.deepEqual(
      kept.map((r) => r.data_id),
      ["a", "d"],
    );
  });

  it("maps every body-comp field and stores raw JSON", () => {
    const mapped = mapScaleRecord(
      {
        data_id: "r1",
        measure_ts: 1_700_000_000_000,
        weight: 79.4,
        bmi: 22.1,
        bmr: 1700,
        body_fat: 18.2,
        body_vfr: 7,
        body_water: 55.1,
        bone_mineral: 3.2,
        muscle: 60.4,
        protein: 16.8,
        metabolic_age: 31,
        impedance1: 500,
        impedance2: 510,
        measure_type: 1,
        device_id: "AA:BB",
        family_member_id: "u1",
        user_id: "u1",
      },
      "America/New_York",
      "2026-10-19T12:00:00.000Z",
    );
    assert.equal(mapped?.id, "r1");
    assert.equal(mapped?.weight_kg, 79.4);
    assert.equal(mapped?.body_fat_pct, 18.2);
    assert.equal(mapped?.visceral_fat, 7);
    assert.equal(mapped?.source, "scale");
    assert.equal(mapped?.impedance, "[500,510]");
    assert.equal(JSON.parse(mapped?.raw_json || "{}").data_id, "r1");
  });
});

describe("noon guard across DST", () => {
  it("runs at 16:00 UTC during EDT and 17:00 UTC during EST", () => {
    // 2026-07-15 16:00 UTC = 12:00 EDT
    assert.equal(isNoonInNewYork(new Date("2026-07-15T16:00:00.000Z")), true);
    assert.equal(isNoonInNewYork(new Date("2026-07-15T17:00:00.000Z")), false);
    // 2026-01-15 17:00 UTC = 12:00 EST
    assert.equal(isNoonInNewYork(new Date("2026-01-15T17:00:00.000Z")), true);
    assert.equal(isNoonInNewYork(new Date("2026-01-15T16:00:00.000Z")), false);
  });

  it("flips with the 2026 DST transitions", () => {
    // DST starts 2026-03-08 02:00 EST → 03:00 EDT; noon that day is 16:00 UTC
    assert.equal(isNoonInNewYork(new Date("2026-03-08T16:00:00.000Z")), true);
    assert.equal(isNoonInNewYork(new Date("2026-03-08T17:00:00.000Z")), false);
    // DST ends 2026-11-01 02:00 EDT → 01:00 EST; noon that day is 17:00 UTC
    assert.equal(isNoonInNewYork(new Date("2026-11-01T17:00:00.000Z")), true);
    assert.equal(isNoonInNewYork(new Date("2026-11-01T16:00:00.000Z")), false);
  });

  it("skips scheduled sync when it is not noon in New York", async () => {
    const result = await maybeRunNoonScaleSync(testEnv(), Date.parse("2026-07-15T17:00:00.000Z"));
    assert.deepEqual(result, { skipped: true, reason: "not_noon_america_new_york" });
  });
});

type Row = Record<string, unknown>;

function mockD1() {
  const measurements = new Map<string, Row>();
  const state = new Map<string, Row>();
  const storeFor = (sql: string) =>
    sql.includes("scale_sync_state") ? state : measurements;

  return {
    measurements,
    state,
    prepare(sql: string) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              const table = storeFor(normalized);
              if (/INSERT INTO scale_measurements/i.test(normalized)) {
                const id = String(args[0]);
                const row: Row = {
                  id,
                  measured_at: args[1],
                  local_date: args[2],
                  weight_kg: args[3],
                  bmi: args[4],
                  bmr: args[5],
                  body_fat_pct: args[6],
                  visceral_fat: args[7],
                  body_water_pct: args[8],
                  bone_mineral_kg: args[9],
                  muscle_kg: args[10],
                  protein_pct: args[11],
                  metabolic_age: args[12],
                  impedance: args[13],
                  measure_type: args[14],
                  device_id: args[15],
                  measure_ts: args[16],
                  body_type: args[17],
                  age: args[18],
                  gender: args[19],
                  height: args[20],
                  occupation: args[21],
                  timezone: args[22],
                  mac: args[23],
                  family_member_id: args[24],
                  user_id: args[25],
                  heart_rate: args[26],
                  raw_json: args[27],
                  source: "scale",
                  synced_at: args[28],
                };
                if (normalized.includes("ON CONFLICT") && table.has(id)) {
                  const prev = table.get(id)!;
                  table.set(id, {
                    ...row,
                    heart_rate: row.heart_rate ?? prev.heart_rate,
                  });
                } else {
                  table.set(id, row);
                }
                return { meta: { changes: 1 } };
              }
              if (/INSERT INTO scale_sync_state/i.test(normalized)) {
                const id = String(args[0]);
                const row: Row = {
                  id,
                  access_token: args[1],
                  refresh_token: args[2],
                  user_id: args[3],
                  phone_id: args[4],
                  access_expires_at: args[5],
                  refresh_expires_at: args[6],
                  login_backoff_until: args[7],
                  last_sync_at: args[8],
                  last_error: args[9],
                  last_count: args[10],
                  updated_at: args[11],
                };
                table.set(id, row);
                return { meta: { changes: 1 } };
              }
              if (/DELETE FROM scale_measurements/i.test(normalized)) {
                const id = String(args[0]);
                const had = table.delete(id);
                return { meta: { changes: had ? 1 : 0 } };
              }
              return { meta: { changes: 0 } };
            },
            async first() {
              const table = storeFor(normalized);
              if (/COUNT\(\*\)/.test(normalized)) return { c: measurements.size };
              if (/ORDER BY measured_at DESC LIMIT 1/.test(normalized)) {
                const rows = [...measurements.values()].sort((a, b) =>
                  String(b.measured_at).localeCompare(String(a.measured_at)),
                );
                return rows[0] ?? null;
              }
              const id = String(args[0]);
              return table.get(id) ?? null;
            },
            async all() {
              return { results: [...storeFor(normalized).values()] };
            },
          };
        },
      };
    },
  };
}

describe("upsert idempotency", () => {
  it("replaces the same data_id instead of inserting a second row", async () => {
    const db = mockD1();
    const env = { DB: db } as unknown as Bindings;
    const base = mapScaleRecord(
      { data_id: "same", measure_ts: 1_700_000_000, weight: 80.1, bmi: 22, device_id: "mac" },
      "America/New_York",
      "2026-10-19T12:00:00.000Z",
    )!;
    await upsertScaleMeasurement(env, base);
    await upsertScaleMeasurement(env, {
      ...base,
      weight_kg: 79.8,
      bmi: 21.9,
      synced_at: "2026-10-20T12:00:00.000Z",
    });
    assert.equal(db.measurements.size, 1);
    const row = db.measurements.get("same")!;
    assert.equal(row.weight_kg, 79.8);
    assert.equal(row.bmi, 21.9);
    assert.equal(row.source, "scale");
  });
});

function testEnv(extra: Record<string, unknown> = {}): Bindings {
  const db = mockD1();
  return {
    DB: db as unknown as D1Database,
    ASSETS: { fetch: async () => new Response("ok") } as Fetcher,
    DREAM_API_TOKEN: "dev-token-not-for-prod",
    DREAM_TZ: "America/New_York",
    ...extra,
  } as Bindings;
}

describe("POST /api/sync/scale auth", () => {
  it("rejects missing credentials", async () => {
    const res = await app.request("https://dream.ultron.sh/api/sync/scale", { method: "POST" }, testEnv());
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "unauthorized");
  });

  it("accepts the bearer token and does not 401 when Wyze is unconfigured", async () => {
    const res = await app.request(
      "https://dream.ultron.sh/api/sync/scale",
      { method: "POST", headers: { authorization: "Bearer dev-token-not-for-prod" } },
      testEnv(),
    );
    assert.notEqual(res.status, 401);
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.match(body.error, /not configured/i);
  });
});
