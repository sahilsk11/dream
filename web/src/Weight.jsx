import React, { useEffect, useMemo, useState } from "react";
import { Minus, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { api } from "./api.js";
import { fmtDay } from "./time.js";

const RANGES = [
  { id: "30d", label: "30d", days: 30 },
  { id: "90d", label: "90d", days: 90 },
  { id: "1y", label: "1y", days: 365 },
  { id: "all", label: "all", days: null },
];

const METRICS = [
  { id: "lbs", label: "weight", unit: "lbs", from: (e) => e.lbs ?? lbsOf(e) },
  { id: "body_fat_pct", label: "body fat", unit: "%", from: (e) => metric(e, "body_fat_pct") },
  { id: "muscle_kg", label: "muscle", unit: "kg", from: (e) => metric(e, "muscle_kg") },
  { id: "body_water_pct", label: "water", unit: "%", from: (e) => metric(e, "body_water_pct") },
  { id: "visceral_fat", label: "visceral", unit: "", from: (e) => metric(e, "visceral_fat") },
  { id: "bmi", label: "bmi", unit: "", from: (e) => metric(e, "bmi") },
  { id: "bmr", label: "bmr", unit: "kcal", from: (e) => metric(e, "bmr") },
  { id: "bone_mineral_kg", label: "bone", unit: "kg", from: (e) => metric(e, "bone_mineral_kg") },
  { id: "protein_pct", label: "protein", unit: "%", from: (e) => metric(e, "protein_pct") },
  { id: "metabolic_age", label: "met. age", unit: "y", from: (e) => metric(e, "metabolic_age") },
];

function lbsOf(e) {
  if (e.lbs != null) return e.lbs;
  if (e.weight_kg != null) return Math.round(e.weight_kg * 2.20462262185 * 10) / 10;
  return null;
}

function metric(e, key) {
  if (e[key] != null) return e[key];
  return e.metrics?.[key] ?? null;
}

function fmt(n, digits = 1) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toFixed(digits);
}

function deltaOf(curr, prev, digits = 1) {
  if (curr == null || prev == null) return null;
  const d = curr - prev;
  if (Math.abs(d) < 10 ** -digits / 2) return { text: "0", dir: "flat" };
  const sign = d > 0 ? "+" : "";
  return { text: `${sign}${d.toFixed(digits)}`, dir: d > 0 ? "up" : "down" };
}

function inRange(iso, range, now) {
  if (!range.days) return true;
  return Date.parse(iso) >= now - range.days * 86400000;
}

export default function Weight({ tz, today, toast }) {
  const [entries, setEntries] = useState([]);
  const [scale, setScale] = useState({ measurements: [], latest: null, previous: null, sync: null });
  const [lbs, setLbs] = useState(176);
  const [editing, setEditing] = useState(null);
  const [metricId, setMetricId] = useState("lbs");
  const [rangeId, setRangeId] = useState("90d");
  const [syncing, setSyncing] = useState(false);

  async function load() {
    const [weight, scaleData] = await Promise.all([api.weight(), api.scale()]);
    const list = weight.entries || [];
    setEntries(list);
    setScale(scaleData);
    const latestLbs = scaleData.latest?.lbs ?? list[0]?.lbs;
    if (latestLbs != null) setLbs(latestLbs);
  }

  useEffect(() => {
    load().catch((e) => toast(e.message));
  }, []);

  const latest = scale.latest;
  const previous = scale.previous;
  const range = RANGES.find((r) => r.id === rangeId) || RANGES[1];
  const selected = METRICS.find((m) => m.id === metricId) || METRICS[0];
  const now = Date.now();

  const series = useMemo(() => {
    const src =
      selected.id === "lbs"
        ? entries.filter((e) => inRange(e.weighed_at, range, now) && lbsOf(e) != null)
        : (scale.measurements || []).filter(
            (e) => inRange(e.measured_at, range, now) && selected.from(e) != null,
          );
    return [...src].reverse();
  }, [entries, scale.measurements, selected, range, now]);

  const chart = useMemo(() => {
    if (series.length < 2) return null;
    const vals = series.map((e) => selected.from(e));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = Math.max(selected.id === "lbs" ? 0.6 : 0.01, max - min);
    const pad = 0.15 * span;
    const lo = min - pad;
    const hi = max + pad;
    const w = 300;
    const h = 120;
    const pts = series.map((e, i) => {
      const x = 10 + (i / (series.length - 1)) * (w - 20);
      const y = 12 + (1 - (selected.from(e) - lo) / (hi - lo)) * (h - 28);
      return { x, y, v: selected.from(e) };
    });
    const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
    const area = `${pts[0].x},${h} ${line} ${pts[pts.length - 1].x},${h}`;
    return { pts, line, area, last: pts[pts.length - 1], hi, lo };
  }, [series, selected]);

  const cards = [
    { label: "body fat", value: latest?.body_fat_pct, unit: "%", prev: previous?.body_fat_pct, digits: 1, invert: true },
    { label: "muscle", value: latest?.muscle_kg, unit: "kg", prev: previous?.muscle_kg, digits: 1 },
    { label: "water", value: latest?.body_water_pct, unit: "%", prev: previous?.body_water_pct, digits: 1 },
    { label: "visceral", value: latest?.visceral_fat, unit: "", prev: previous?.visceral_fat, digits: 1, invert: true },
    { label: "bmi", value: latest?.bmi, unit: "", prev: previous?.bmi, digits: 1, invert: true },
    { label: "bmr", value: latest?.bmr, unit: "kcal", prev: previous?.bmr, digits: 0 },
    { label: "bone", value: latest?.bone_mineral_kg, unit: "kg", prev: previous?.bone_mineral_kg, digits: 2 },
    { label: "protein", value: latest?.protein_pct, unit: "%", prev: previous?.protein_pct, digits: 1 },
    { label: "met. age", value: latest?.metabolic_age, unit: "y", prev: previous?.metabolic_age, digits: 0, invert: true },
  ];

  const weightDelta = deltaOf(latest?.lbs, previous?.lbs);
  void today;

  async function syncNow() {
    setSyncing(true);
    try {
      const result = await api.syncScale();
      if (result.ok) toast(`synced ${result.upserted} reading${result.upserted === 1 ? "" : "s"}`);
      else toast(result.error || "scale sync failed");
      await load();
    } catch (e) {
      toast(e.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <div className="weight-big" style={{ marginTop: 12 }}>{fmt(latest?.lbs ?? lbs, 1)}</div>
      <div className="weight-unit">pounds{latest ? " · scale" : ""}</div>
      {weightDelta ? (
        <div className={`delta-line ${weightDelta.dir}`}>{weightDelta.text} lbs vs last</div>
      ) : null}

      {scale.sync?.last_error ? <div className="sync-error">{scale.sync.last_error}</div> : null}
      <div className="sync-bar">
        <span>
          {scale.sync?.last_sync_at
            ? `synced ${fmtDay(scale.sync.last_sync_at.slice(0, 10), tz)}`
            : "scale not synced yet"}
          {scale.sync?.last_count != null ? ` · ${scale.sync.last_count}` : ""}
        </span>
        <button type="button" className="quiet sync-btn" onClick={syncNow} disabled={syncing}>
          <RefreshCw size={14} strokeWidth={2} className={syncing ? "spin" : ""} />
          {syncing ? "syncing" : "sync scale"}
        </button>
      </div>

      {latest ? (
        <div className="metric-grid">
          {cards.map((c) => {
            const d = deltaOf(c.value, c.prev, c.digits);
            const good = d && ((c.invert && d.dir === "down") || (!c.invert && d.dir === "up"));
            return (
              <div key={c.label} className="metric-cell">
                <div className="metric-label">{c.label}</div>
                <div className="metric-value">
                  {fmt(c.value, c.digits)}
                  {c.unit ? <span>{c.unit}</span> : null}
                </div>
                {d ? <div className={`delta ${good ? "good" : d.dir}`}>{d.text}</div> : <div className="delta flat">—</div>}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="chip-row range-row">
        {RANGES.map((r) => (
          <button key={r.id} type="button" className={`chip ${rangeId === r.id ? "starred" : ""}`} onClick={() => setRangeId(r.id)}>
            {r.label}
          </button>
        ))}
      </div>
      <div className="chip-row metric-row">
        {METRICS.map((m) => (
          <button key={m.id} type="button" className={`chip ${metricId === m.id ? "starred" : ""}`} onClick={() => setMetricId(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      {chart ? (
        <svg className="trend trend-lg" viewBox="0 0 300 120" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c80ff" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#7c80ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={chart.area} fill="url(#wfill)" />
          <polyline points={chart.line} fill="none" stroke="#8b8eff" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={chart.last.x} cy={chart.last.y} r="4.2" fill="#f2f0f8" stroke="#7c80ff" strokeWidth="2" />
        </svg>
      ) : (
        <p className="empty">not enough points for a {selected.label} trend</p>
      )}
      <div className="chart-caption">
        {selected.label}
        {selected.unit ? ` (${selected.unit})` : ""} · {range.label}
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <div className="qty">
          <button type="button" aria-label="decrease" onClick={() => setLbs(Math.round((lbs - 0.2) * 10) / 10)}>
            <Minus size={16} strokeWidth={2} />
          </button>
          <input
            inputMode="decimal"
            value={lbs}
            onChange={(e) => setLbs(Number(e.target.value) || 0)}
          />
          <button type="button" aria-label="increase" onClick={() => setLbs(Math.round((lbs + 0.2) * 10) / 10)}>
            <Plus size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <button
        className="primary block"
        onClick={async () => {
          await api.addWeight({ lbs });
          toast(`logged ${lbs.toFixed(1)} lbs`);
          load();
        }}
      >
        log {Number(lbs).toFixed(1)} lbs
      </button>

      <div className="section-label">log</div>
      <div className="list">
        {entries.map((e) => {
          const fat = metric(e, "body_fat_pct");
          return (
            <div key={e.id} className="row-item" onClick={() => setEditing(e)}>
              <div className="grow">
                <div className="row-title">{fmt(lbsOf(e), 1)} lbs</div>
                <div className="row-meta">
                  {fmtDay(e.local_date, tz)}
                  {fat != null ? ` · ${fmt(fat, 1)}% fat` : ""}
                  {e.is_example ? " · example" : ""}
                </div>
              </div>
              <div className="source-tag">{e.source}</div>
              <div className="row-actions" onClick={(ev) => ev.stopPropagation()}>
                <button
                  className="ghost-btn danger"
                  aria-label="delete"
                  onClick={async () => {
                    await api.deleteWeight(e.id);
                    toast("deleted");
                    load();
                  }}
                >
                  <Trash2 size={16} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="tail" aria-hidden="true" />

      {editing ? (
        <>
          <div className="backdrop" onClick={() => setEditing(null)} />
          <div className="sheet">
            <div className="grabber" />
            <div className="sheet-head">
              <div>
                <h3>{editing.source === "scale" ? "scale reading" : "edit weight"}</h3>
                <p className="lede">{fmtDay(editing.local_date, tz)}</p>
              </div>
              <button className="icon-btn" aria-label="close" onClick={() => setEditing(null)}>
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            {editing.source === "scale" ? (
              <div className="metric-grid sheet-metrics">
                {[
                  ["weight", fmt(lbsOf(editing), 1), "lbs"],
                  ["body fat", fmt(metric(editing, "body_fat_pct"), 1), "%"],
                  ["muscle", fmt(metric(editing, "muscle_kg"), 1), "kg"],
                  ["water", fmt(metric(editing, "body_water_pct"), 1), "%"],
                  ["visceral", fmt(metric(editing, "visceral_fat"), 1), ""],
                  ["bmi", fmt(metric(editing, "bmi"), 1), ""],
                  ["bmr", fmt(metric(editing, "bmr"), 0), "kcal"],
                  ["bone", fmt(metric(editing, "bone_mineral_kg"), 2), "kg"],
                  ["protein", fmt(metric(editing, "protein_pct"), 1), "%"],
                  ["met. age", fmt(metric(editing, "metabolic_age"), 0), "y"],
                ].map(([label, value, unit]) => (
                  <div key={label} className="metric-cell">
                    <div className="metric-label">{label}</div>
                    <div className="metric-value">
                      {value}
                      {unit ? <span>{unit}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="field">
                <label>lbs</label>
                <input
                  inputMode="decimal"
                  value={editing.lbs}
                  onChange={(e) => setEditing({ ...editing, lbs: Number(e.target.value) })}
                />
              </div>
            )}
            {editing.source === "scale" ? null : (
              <button
                className="primary block"
                onClick={async () => {
                  await api.patchWeight(editing.id, { lbs: editing.lbs });
                  setEditing(null);
                  toast("updated");
                  load();
                }}
              >
                save
              </button>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}
