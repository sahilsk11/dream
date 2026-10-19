import React, { useEffect, useState } from "react";
import { Moon, Utensils, Weight as WeightIcon } from "lucide-react";
import { api } from "./api.js";
import { localDate } from "./time.js";
import Sleep from "./Sleep.jsx";
import Food from "./Food.jsx";
import Weight from "./Weight.jsx";

const TABS = [
  { id: "sleep", label: "sleep", Icon: Moon },
  { id: "food", label: "food", Icon: Utensils },
  { id: "weight", label: "weight", Icon: WeightIcon },
];

function hashPage() {
  const h = (window.location.hash || "#sleep").replace("#", "");
  return TABS.some((t) => t.id === h) ? h : "sleep";
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" />
      <span className="brand-word">dream</span>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState(hashPage);
  const [me, setMe] = useState(null);
  const [authed, setAuthed] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const onHash = () => setPage(hashPage());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
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

  if (authed === null) {
    return (
      <div className="login">
        <Brand />
      </div>
    );
  }

  if (!authed) {
    // Cloudflare Access is the only gate. Getting here means the Access
    // session is missing or expired; a reload sends the browser back through it.
    return (
      <div className="login">
        <Brand />
        <h1>dream</h1>
        <p className="acronym">DATA RULES EVERYTHING AROUND ME</p>
        <button className="primary" onClick={() => window.location.reload()}>
          sign in again
        </button>
      </div>
    );
  }

  const tz = me?.tz || "America/New_York";
  const today = me?.today || localDate(new Date(), tz);

  return (
    <div className="app">
      <aside className="side-rail">
        <Brand />
        <div className="side-links">
          {TABS.map((t) => (
            <button key={t.id} className={page === t.id ? "on" : ""} onClick={() => go(t.id)}>
              <t.Icon size={18} strokeWidth={1.75} />
              {t.label}
            </button>
          ))}
        </div>
        <p className="side-foot">DATA RULES EVERYTHING AROUND ME</p>
      </aside>

      <header className="topbar">
        <Brand />
        {me?.example_data ? <span className="example-pill">example</span> : null}
      </header>

      <main className="page">
        {page === "sleep" ? <Sleep tz={tz} today={today} toast={showToast} /> : null}
        {page === "food" ? <Food tz={tz} today={today} toast={showToast} /> : null}
        {page === "weight" ? <Weight tz={tz} today={today} toast={showToast} /> : null}
      </main>

      <nav className="bottom-nav">
        {TABS.map((t) => (
          <button key={t.id} className={page === t.id ? "on" : ""} onClick={() => go(t.id)}>
            <t.Icon size={22} strokeWidth={page === t.id ? 2.1 : 1.7} />
            {t.label}
          </button>
        ))}
      </nav>
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
