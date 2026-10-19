import React, { useEffect, useState } from "react";
import { api } from "./api.js";
import { localDate } from "./time.js";
import Sleep from "./Sleep.jsx";
import Food from "./Food.jsx";
import Weight from "./Weight.jsx";

const TABS = [
  { id: "sleep", label: "sleep" },
  { id: "food", label: "food" },
  { id: "weight", label: "weight" },
];

function hashPage() {
  const h = (window.location.hash || "#sleep").replace("#", "");
  return TABS.some((t) => t.id === h) ? h : "sleep";
}

export default function App() {
  const [page, setPage] = useState(hashPage);
  const [me, setMe] = useState(null);
  const [authed, setAuthed] = useState(null);
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    const onHash = () => setPage(hashPage());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((h) => setDemo(!!h.demo))
      .catch(() => {});
    api
      .me()
      .then((data) => {
        setMe(data);
        setAuthed(true);
      })
      .catch(() => setAuthed(false));
  }, []);

  function go(id) {
    window.location.hash = id;
    setPage(id);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  }

  async function submitPass(next) {
    const code = next ?? pass;
    setErr("");
    try {
      await api.login(code);
      const data = await api.me();
      setMe(data);
      setAuthed(true);
      setPass("");
    } catch {
      setErr("nope");
      setPass("");
    }
  }

  function onDigit(d) {
    const next = (pass + d).slice(0, 8);
    setPass(next);
    if (next.length >= 4) submitPass(next);
  }

  if (authed === null) {
    return (
      <div className="login">
        <img src="/dream.png" width="64" alt="" />
        <h1>DREAM</h1>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="login">
        <img src="/astronaut.png" width="72" alt="" />
        <h1>DREAM</h1>
        <p className="acronym">DATA RULES EVERYTHING AROUND ME</p>
        <div className="dots">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`dot ${pass.length > i ? "filled" : ""}`} />
          ))}
        </div>
        <div className="pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, "⌫", 0, "ok"].map((k) => (
            <button
              key={k}
              onClick={() => {
                if (k === "⌫") setPass((p) => p.slice(0, -1));
                else if (k === "ok") submitPass();
                else onDigit(String(k));
              }}
            >
              {k}
            </button>
          ))}
        </div>
        {err ? <p className="login-hint">{err}</p> : null}
        {demo ? <p className="login-hint">local example passcode is 2468</p> : null}
      </div>
    );
  }

  const tz = me?.tz || "America/Los_Angeles";
  const today = me?.today || localDate(new Date(), tz);

  return (
    <div className="app">
      <aside className="side-rail">
        <div className="side-inner">
          <div className="space-guys" style={{ margin: "0 auto 8px", width: 120, height: 70 }}>
            <img src="/star.png" className="star-a" alt="" />
            <img src="/star1.png" className="star-b" alt="" />
            <img src="/star.png" className="star-c" alt="" />
            <img src="/astronaut.png" className="astro" alt="" />
          </div>
          <h1 className="side-title">DREAM</h1>
          <div className="side-links">
            {TABS.map((t) => (
              <button key={t.id} className={page === t.id ? "on" : ""} onClick={() => go(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="side-foot">
            <img src="/dream.png" width="36" alt="" />
            <p>DATA RULES EVERYTHING AROUND ME</p>
          </div>
        </div>
      </aside>

      <header className="topbar">
        <img src="/dream.png" className="chip-logo" alt="" />
        <h1 className="topbar-title">DREAM</h1>
        <div className="space-guys">
          <img src="/star.png" className="star-a" alt="" />
          <img src="/star1.png" className="star-b" alt="" />
          <img src="/astronaut.png" className="astro" alt="" />
        </div>
      </header>

      {me?.example_data ? (
        <div className="example-banner">EXAMPLE DATA — labeled sample, not live sensor/food logs</div>
      ) : null}

      <main className="page">
        {page === "sleep" ? <Sleep tz={tz} today={today} toast={showToast} /> : null}
        {page === "food" ? <Food tz={tz} today={today} toast={showToast} /> : null}
        {page === "weight" ? <Weight tz={tz} today={today} toast={showToast} /> : null}
      </main>

      <nav className="bottom-nav">
        {TABS.map((t) => (
          <button key={t.id} className={page === t.id ? "on" : ""} onClick={() => go(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
