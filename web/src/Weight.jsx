import React, { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { api } from "./api.js";
import { fmtDay } from "./time.js";

export default function Weight({ tz, today, toast }) {
  const [entries, setEntries] = useState([]);
  const [lbs, setLbs] = useState(176);
  const [editing, setEditing] = useState(null);

  async function load() {
    const data = await api.weight();
    const list = data.entries || [];
    setEntries(list);
    if (list[0]) setLbs(list[0].lbs);
  }

  useEffect(() => {
    load().catch((e) => toast(e.message));
  }, []);

  const chron = [...entries].reverse();
  const chart = useMemo(() => {
    if (chron.length < 2) return null;
    const min = Math.min(...chron.map((e) => e.lbs));
    const max = Math.max(...chron.map((e) => e.lbs));
    const span = Math.max(0.6, max - min);
    const pad = 0.15 * span;
    const lo = min - pad;
    const hi = max + pad;
    const w = 300;
    const h = 96;
    const pts = chron.map((e, i) => {
      const x = 10 + (i / (chron.length - 1)) * (w - 20);
      const y = 10 + (1 - (e.lbs - lo) / (hi - lo)) * (h - 24);
      return { x, y, lbs: e.lbs };
    });
    const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
    const area = `${pts[0].x},${h} ${line} ${pts[pts.length - 1].x},${h}`;
    return { pts, line, area, last: pts[pts.length - 1], first: pts[0] };
  }, [entries]);

  void today;

  return (
    <>
      <div className="weight-big" style={{ marginTop: 12 }}>{lbs.toFixed(1)}</div>
      <div className="weight-unit">pounds</div>

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

      {chart ? (
        <svg className="trend" viewBox="0 0 300 96" preserveAspectRatio="none">
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
      ) : null}

      <button
        className="primary block"
        onClick={async () => {
          await api.addWeight({ lbs });
          toast(`logged ${lbs.toFixed(1)} lbs`);
          load();
        }}
      >
        log {lbs.toFixed(1)} lbs
      </button>

      <div className="section-label">log</div>
      <div className="list">
        {entries.map((e) => (
          <div key={e.id} className="row-item" onClick={() => setEditing(e)}>
            <div className="grow">
              <div className="row-title">{e.lbs.toFixed(1)} lbs</div>
              <div className="row-meta">
                {fmtDay(e.local_date, tz)}
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
        ))}
      </div>

      <div className="tail" aria-hidden="true" />

      {editing ? (
        <>
          <div className="backdrop" onClick={() => setEditing(null)} />
          <div className="sheet">
            <div className="grabber" />
            <div className="sheet-head">
              <div>
                <h3>edit weight</h3>
                <p className="lede">{fmtDay(editing.local_date, tz)}</p>
              </div>
              <button className="icon-btn" aria-label="close" onClick={() => setEditing(null)}>
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <div className="field">
              <label>lbs</label>
              <input
                inputMode="decimal"
                value={editing.lbs}
                onChange={(e) => setEditing({ ...editing, lbs: Number(e.target.value) })}
              />
            </div>
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
          </div>
        </>
      ) : null}
    </>
  );
}
