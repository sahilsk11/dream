import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractJsonArray, parseFoodText } from "../worker/parse.ts";

describe("parseFoodText", () => {
  it("splits comma and 'and' lists with quantities", () => {
    const items = parseFoodText("2 eggs and a banana, 1 cup oats");
    assert.deepEqual(
      items.map((i) => ({ q: i.quantity, u: i.unit, n: i.name })),
      [
        { q: 2, u: "serving", n: "eggs" },
        { q: 1, u: "piece", n: "banana" },
        { q: 1, u: "cup", n: "oats" },
      ],
    );
  });

  it("keeps unit-less names as one serving for search", () => {
    const items = parseFoodText("greek yogurt");
    assert.equal(items.length, 1);
    assert.equal(items[0].name, "greek yogurt");
    assert.equal(items[0].quantity, 1);
  });

  it("does not invent calories", () => {
    const items = parseFoodText("3 tbsp peanut butter");
    assert.equal("calories" in items[0], false);
    assert.equal(items[0].unit, "tbsp");
    assert.equal(items[0].quantity, 3);
  });
});

describe("extractJsonArray", () => {
  it("reads an LLM JSON payload and ignores prose", () => {
    const items = extractJsonArray(
      'Sure:\n[{"name":"egg","quantity":2,"unit":"piece"}]\n',
    );
    assert.deepEqual(items, [{ name: "egg", quantity: 2, unit: "piece" }]);
  });
});
