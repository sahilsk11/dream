import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decideSleepIngest, type IngestInterval } from "../worker/sleep.ts";
import type { SleepRow } from "../worker/types.ts";
import { sleepDay, overlapMs, addDays } from "../worker/time.ts";

const edited = (over: Partial<SleepRow> = {}): SleepRow => ({
  id: "e1",
  start_at: "2026-10-18T07:00:00.000Z",
  end_at: "2026-10-18T14:00:00.000Z",
  local_date: "2026-10-18",
  source: "edited",
  confirmed: 1,
  external_id: "ha-1",
  notes: null,
  is_example: 0,
  created_at: "2026-10-18T14:00:00.000Z",
  updated_at: "2026-10-18T14:00:00.000Z",
  ...over,
});

describe("sleepDay", () => {
  it("assigns overnight sleep to the wake date in America/Los_Angeles", () => {
    // 23:00 PDT Oct 18 → 07:00 PDT Oct 19 is 06:00–14:00 UTC Oct 19
    assert.equal(sleepDay("2026-10-19T14:00:00.000Z", "America/Los_Angeles"), "2026-10-19");
  });

  it("assigns an afternoon nap to the same local date", () => {
    // 14:10 PDT Oct 19 = 21:10 UTC
    assert.equal(sleepDay("2026-10-19T21:52:00.000Z", "America/Los_Angeles"), "2026-10-19");
  });
});

describe("addDays", () => {
  it("crosses month boundaries", () => {
    assert.equal(addDays("2026-10-01", -1), "2026-09-30");
  });
});

describe("decideSleepIngest", () => {
  const interval: IngestInterval = {
    start: "2026-10-18T07:10:00.000Z",
    end: "2026-10-18T14:05:00.000Z",
    external_id: "ha-1",
  };

  it("does not clobber an edited session with the same external_id", () => {
    const d = decideSleepIngest([edited()], interval);
    assert.equal(d.action, "skip");
    if (d.action === "skip") assert.equal(d.reason, "edited_wins");
  });

  it("does not clobber a confirmed sensor session", () => {
    const d = decideSleepIngest(
      [edited({ source: "sensor", confirmed: 1 })],
      interval,
    );
    assert.equal(d.action, "skip");
  });

  it("updates an unconfirmed sensor session with the same external_id", () => {
    const d = decideSleepIngest(
      [edited({ source: "sensor", confirmed: 0 })],
      interval,
    );
    assert.equal(d.action, "update");
  });

  it("skips a new interval that overlaps an edited session", () => {
    const d = decideSleepIngest(
      [edited({ external_id: "other" })],
      { ...interval, external_id: "ha-new" },
    );
    assert.equal(d.action, "skip");
    if (d.action === "skip") assert.equal(d.reason, "edited_wins");
  });

  it("inserts a non-overlapping sensor interval", () => {
    const d = decideSleepIngest(
      [edited()],
      {
        start: "2026-10-18T21:10:00.000Z",
        end: "2026-10-18T21:52:00.000Z",
        external_id: "ha-nap",
      },
    );
    assert.equal(d.action, "insert");
  });
});

describe("overlapMs", () => {
  it("returns 0 for disjoint ranges", () => {
    assert.equal(
      overlapMs(
        "2026-10-18T00:00:00.000Z",
        "2026-10-18T01:00:00.000Z",
        "2026-10-18T02:00:00.000Z",
        "2026-10-18T03:00:00.000Z",
      ),
      0,
    );
  });
});
