import React, { useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import {
  addDays,
  dayWindow,
  durationLabel,
  fmtDay,
  fmtTime,
  fromDatetimeLocal,
  snapIso,
  toDatetimeLocal,
} from "./time.js";

function isNap(session, tz) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date(session.start_at)),
  );
  return hour >= 10 && hour < 18;
}

export default function Sleep({ tz, today, toast }) {
  const [date, setDate] = useState(today);
  const [sessions, setSessions] = useState([]);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  async function load(d = date) {
    const data = await api.sleep(d);
    setSessions(data.sessions || []);
  }

  useEffect(() => {
    load(date).catch((e) => toast(e.message));
  }, [date]);

  const win = dayWindow(date, tz);
  const unconfirmed = sessions.filter((s) => !s.confirmed);

  return (
    <>
      <div className="card">
        <div className="row date-nav">
          <button className="ghost" onClick={() => setDate(addDays(date, -1))} aria-label="previous day">
            ‹
          </button>
          <div>
            <h2>sleep</h2>
            <p className="sub">{fmtDay(date, tz)}</p>
          </div>
          <button className="ghost" onClick={() => setDate(addDays(date, 1))} aria-label="next day">
            ›
          </button>
        </div>
        {date !== today ? (
          <button className="quiet" onClick={() => setDate(today)}>
            today
          </button>
        ) : null}

        <Timeline sessions={sessions} win={win} tz={tz} onPick={setEditing} />
        <div className="tl-hours">
          <span>6pm</span><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span>
        </div>

        {unconfirmed.length ? (
          <p className="sub" style={{ marginTop: 12 }}>
            {unconfirmed.length} unconfirmed sensor session{unconfirmed.length > 1 ? "s" : ""} — tap to confirm or drag times
          </p>
        ) : null}

        {sessions.length === 0 ? <p className="sub">no sessions this day</p> : null}

        {sessions.map((s, i) => (
          <div key={s.id} className={`session ${s.confirmed ? "" : "unconfirmed"}`}>
            <div className="row">
              <div className="grow">
                <div className="session-times">
                  {fmtTime(s.start_at, tz)} – {fmtTime(s.end_at, tz)}
                </div>
                <div className="sub">
                  {durationLabel(s.duration_min)}
                  {isNap(s, tz) ? " · nap" : ""}
                  {s.notes ? ` · ${s.notes}` : ""}
                </div>
              </div>
              <span className="source-tag">{s.confirmed ? s.source : "unconfirmed"}</span>
            </div>
            <div className="actions">
              {!s.confirmed ? (
                <button
                  className="primary"
                  onClick={async () => {
                    await api.confirmSleep(s.id);
                    toast("confirmed");
                    load();
                  }}
                >
                  confirm
                </button>
              ) : null}
              <button className="quiet" onClick={() => setEditing(s)}>
                edit
              </button>
              {sessions[i + 1] ? (
                <button
                  className="quiet"
                  onClick={async () => {
                    await api.mergeSleep(s.id, sessions[i + 1].id);
                    toast("merged");
                    load();
                  }}
                >
                  merge next
                </button>
              ) : null}
            </div>
          </div>
        ))}

        <button className="primary" style={{ width: "100%", marginTop: 12 }} onClick={() => setAdding(true)}>
          add session
        </button>
      </div>

      {editing ? (
        <Editor
          tz={tz}
          session={editing}
          win={win}
          onClose={() => setEditing(null)}
          onSaved={async (msg) => {
            setEditing(null);
            toast(msg);
            load();
          }}
        />
      ) : null}

      {adding ? (
        <AddSheet
          tz={tz}
          date={date}
          onClose={() => setAdding(false)}
          onSaved={async () => {
            setAdding(false);
            toast("logged");
            load();
          }}
        />
      ) : null}
    </>
  );
}

function Timeline({ sessions, win, tz, onPick, activeId, onDrag }) {
  const span = win.endMs - win.startMs;
  return (
    <div className="timeline">
      {sessions.map((s) => {
        const left = ((Date.parse(s.start_at) - win.startMs) / span) * 100;
        const right = ((win.endMs - Date.parse(s.end_at)) / span) * 100;
        const nap = isNap(s, tz);
        return (
          <div
            key={s.id}
            className={`tl-block ${nap ? "nap" : ""} ${s.confirmed ? "" : "unconfirmed"} ${activeId === s.id ? "editing" : ""}`}
            style={{ left: `${Math.max(0, left)}%`, right: `${Math.max(0, right)}%` }}
            onClick={() => onPick?.(s)}
          >
            {onDrag && activeId === s.id ? (
              <>
                <div className="handle start" onPointerDown={(e) => onDrag(e, "start")} />
                <div className="handle end" onPointerDown={(e) => onDrag(e, "end")} />
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Editor({ tz, session, win, onClose, onSaved }) {
  const [start, setStart] = useState(session.start_at);
  const [end, setEnd] = useState(session.end_at);
  const [notes, setNotes] = useState(session.notes || "");
  const drag = useRef(null);
  const [localWin] = useState(() => {
    const spanMs = Math.max(45 * 60 * 1000, Date.parse(session.end_at) - Date.parse(session.start_at));
    const pad = Math.max(45 * 60 * 1000, spanMs * 0.5);
    return {
      startMs: Date.parse(session.start_at) - pad,
      endMs: Date.parse(session.end_at) + pad,
    };
  });
  void win;

  function onDrag(e, which) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const bar = e.currentTarget.parentElement.parentElement.getBoundingClientRect();
    drag.current = { which, bar };
    const move = (ev) => {
      const x = Math.min(Math.max(ev.clientX - bar.left, 0), bar.width);
      const t = snapIso(
        new Date(localWin.startMs + (x / bar.width) * (localWin.endMs - localWin.startMs)).toISOString(),
      );
      if (which === "start") setStart(t);
      else setEnd(t);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const draft = { ...session, start_at: start, end_at: end };

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet">
        <h3>edit session</h3>
        <Timeline sessions={[draft]} win={localWin} tz={tz} activeId={session.id} onDrag={onDrag} />
        <p className="sub">drag the purple handles (5-min steps), or type times</p>
        <div className="field">
          <label>start</label>
          <input
            type="datetime-local"
            value={toDatetimeLocal(start, tz)}
            onChange={(e) => setStart(fromDatetimeLocal(e.target.value, tz))}
          />
        </div>
        <div className="field">
          <label>end</label>
          <input
            type="datetime-local"
            value={toDatetimeLocal(end, tz)}
            onChange={(e) => setEnd(fromDatetimeLocal(e.target.value, tz))}
          />
        </div>
        <div className="field">
          <label>notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="actions">
          <button
            className="primary"
            onClick={async () => {
              await api.patchSleep(session.id, { start_at: start, end_at: end, notes });
              onSaved("saved");
            }}
          >
            save
          </button>
          <button
            className="quiet"
            onClick={async () => {
              const mid = new Date((Date.parse(start) + Date.parse(end)) / 2).toISOString();
              await api.splitSleep(session.id, mid);
              onSaved("split");
            }}
          >
            split
          </button>
          <button
            className="danger"
            onClick={async () => {
              await api.deleteSleep(session.id);
              onSaved("deleted");
            }}
          >
            delete
          </button>
        </div>
      </div>
    </>
  );
}

function AddSheet({ tz, date, onClose, onSaved }) {
  const [start, setStart] = useState(fromDatetimeLocal(`${addDays(date, -1)}T23:00`, tz));
  const [end, setEnd] = useState(fromDatetimeLocal(`${date}T07:00`, tz));
  const [notes, setNotes] = useState("");

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet">
        <h3>add session</h3>
        <div className="field">
          <label>start</label>
          <input
            type="datetime-local"
            value={toDatetimeLocal(start, tz)}
            onChange={(e) => setStart(fromDatetimeLocal(e.target.value, tz))}
          />
        </div>
        <div className="field">
          <label>end</label>
          <input
            type="datetime-local"
            value={toDatetimeLocal(end, tz)}
            onChange={(e) => setEnd(fromDatetimeLocal(e.target.value, tz))}
          />
        </div>
        <div className="field">
          <label>notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="nap, split night…" />
        </div>
        <button
          className="primary"
          style={{ width: "100%" }}
          onClick={async () => {
            await api.addSleep({ start_at: start, end_at: end, notes });
            onSaved();
          }}
        >
          add
        </button>
      </div>
    </>
  );
}
