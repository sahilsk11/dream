import React, { useEffect, useState } from "react";
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
  const min = Math.min(...chron.map((e) => e.lbs), lbs);
  const max = Math.max(...chron.map((e) => e.lbs), lbs);
  const span = Math.max(1, max - min);

  return (
    <>
      <div className="card">
        <h2>weight</h2>
        <p className="sub">one tap · lbs</p>
        <div className="weight-big">{lbs.toFixed(1)}</div>
        <div className="row" style={{ justifyContent: "center", gap: 12 }}>
          <div className="qty">
            <button type="button" onClick={() => setLbs(Math.round((lbs - 0.2) * 10) / 10)}>
              –
            </button>
            <input
              inputMode="decimal"
              value={lbs}
              onChange={(e) => setLbs(Number(e.target.value) || 0)}
            />
            <button type="button" onClick={() => setLbs(Math.round((lbs + 0.2) * 10) / 10)}>
              +
            </button>
          </div>
        </div>
        {chron.length > 1 ? (
          <svg className="trend" viewBox="0 0 300 72" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="#6466FF"
              strokeWidth="3"
              points={chron
                .map((e, i) => {
                  const x = (i / (chron.length - 1)) * 300;
                  const y = 64 - ((e.lbs - min) / span) * 52;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
          </svg>
        ) : null}
        <button
          className="primary"
          style={{ width: "100%" }}
          onClick={async () => {
            await api.addWeight({ lbs });
            toast(`logged ${lbs.toFixed(1)} lbs`);
            load();
          }}
        >
          log {lbs.toFixed(1)} lbs
        </button>
      </div>

      <div className="card">
        <h2>log</h2>
        <p className="sub">edit / delete</p>
        {entries.map((e) => (
          <div key={e.id} className="session">
            <div className="row">
              <div className="grow">
                <div className="session-times">{e.lbs.toFixed(1)} lbs</div>
                <div className="sub">
                  {fmtDay(e.local_date, tz)}
                  {e.is_example ? " · EXAMPLE" : ""}
                </div>
              </div>
              <span className="source-tag">{e.source}</span>
            </div>
            <div className="actions">
              <button className="quiet" onClick={() => setEditing(e)}>
                edit
              </button>
              <button
                className="danger"
                onClick={async () => {
                  await api.deleteWeight(e.id);
                  toast("deleted");
                  load();
                }}
              >
                delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing ? (
        <>
          <div className="backdrop" onClick={() => setEditing(null)} />
          <div className="sheet">
            <h3>edit weight</h3>
            <div className="field">
              <label>lbs</label>
              <input
                inputMode="decimal"
                value={editing.lbs}
                onChange={(e) => setEditing({ ...editing, lbs: Number(e.target.value) })}
              />
            </div>
            <button
              className="primary"
              style={{ width: "100%" }}
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
