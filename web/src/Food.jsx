import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, ScanLine, Search, Star, Trash2, X } from "lucide-react";
import { api } from "./api.js";
import { addDays, fmtDay, fmtTime } from "./time.js";

function Qty({ value, onChange }) {
  return (
    <div className="qty">
      <button type="button" aria-label="decrease" onClick={() => onChange(Math.max(0.25, Math.round((value - 0.5) * 100) / 100))}>
        <Minus size={16} strokeWidth={2} />
      </button>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
      <button type="button" aria-label="increase" onClick={() => onChange(Math.round((value + 0.5) * 100) / 100)}>
        <Plus size={16} strokeWidth={2} />
      </button>
    </div>
  );
}

function macros(item) {
  return item.calories != null ? `${Math.round(item.calories)}` : "—";
}

function shortName(name) {
  return (name || "").replace(/^EXAMPLE · /, "").split(",")[0];
}

export default function Food({ tz, today, toast }) {
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState(null);
  const [recents, setRecents] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState([]);
  const [parseText, setParseText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [confirmItems, setConfirmItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [barcode, setBarcode] = useState("");
  const fileRef = useRef(null);
  const searchTimer = useRef(null);

  async function load() {
    const [food, r, f] = await Promise.all([api.food(date), api.recents(), api.favorites()]);
    setEntries(food.entries || []);
    setTotals(food.totals);
    setRecents(r.recents || []);
    setFavorites(f.favorites || []);
  }

  useEffect(() => {
    load().catch((e) => toast(e.message));
  }, [date]);

  function search(text) {
    setQ(text);
    clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setMatches([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      const data = await api.searchFood(text.trim());
      setMatches(data.matches || []);
    }, 180);
  }

  async function logFood(food, extra = {}) {
    const body = { ...food, ...extra, eaten_at: extra.eaten_at };
    await api.addFood(body);
    toast(`logged ${shortName(food.name)}`);
    setMatches([]);
    setQ("");
    setParsed(null);
    setConfirmItems(null);
    load();
  }

  async function scanCode(code) {
    try {
      const data = await api.barcode(code);
      await logFood(data.food);
    } catch {
      toast("barcode not in open food facts");
    }
  }

  async function onPickImage(file) {
    if (!file) return;
    if (window.BarcodeDetector) {
      try {
        const detector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
        });
        const bmp = await createImageBitmap(file);
        const codes = await detector.detect(bmp);
        if (codes[0]?.rawValue) {
          setBarcode(codes[0].rawValue);
          await scanCode(codes[0].rawValue);
          return;
        }
      } catch {
        /* fall through */
      }
    }
    toast("couldn't read barcode — type it");
  }

  return (
    <>
      <div className="hero">
        <div style={{ width: "100%" }}>
          <div className="date-nav" style={{ justifyContent: "space-between" }}>
            <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="previous day">
              <ChevronLeft size={22} strokeWidth={1.75} />
            </button>
            <h1>{fmtDay(date, tz)}</h1>
            <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="next day">
              <ChevronRight size={22} strokeWidth={1.75} />
            </button>
          </div>
          <div className="metric" style={{ textAlign: "center", marginTop: 8 }}>
            {totals ? Math.round(totals.calories) : 0}
            <span>kcal</span>
          </div>
          <p className="sub" style={{ textAlign: "center" }}>
            {entries.length ? `${entries.length} logged` : "nothing yet"}
          </p>
        </div>
      </div>

      <div className="search-wrap">
        <Search size={18} strokeWidth={1.75} color="#8d8998" />
        <input
          placeholder="search USDA…"
          value={q}
          onChange={(e) => search(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && /^\d{8,14}$/.test(q.trim())) scanCode(q.trim());
          }}
        />
        <button className="icon-btn accent" aria-label="scan barcode" onClick={() => fileRef.current?.click()}>
          <ScanLine size={18} strokeWidth={1.75} />
        </button>
        <input
          ref={fileRef}
          className="hidden-file"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => onPickImage(e.target.files?.[0])}
        />
      </div>
      <input
        className="bare-input"
        placeholder="or type a barcode"
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && barcode.trim()) scanCode(barcode.trim());
        }}
      />

      {favorites.length ? (
        <>
          <div className="section-label">favorites</div>
          <div className="chip-row">
            {favorites.map((f) => (
              <button key={f.id} className="chip starred" onClick={() => logFood({ ...f, source: f.source || "usda" })}>
                <Star size={12} strokeWidth={2} fill="currentColor" />
                {shortName(f.name)}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {recents.length ? (
        <>
          <div className="section-label">recents</div>
          <div className="list">
            {recents.map((f) => (
              <button key={f.id} className="plus-row" onClick={() => logFood({ ...f, source: f.source || "usda" })}>
                <div className="grow">
                  <div className="row-title">{shortName(f.name)}</div>
                  <div className="row-meta">
                    {f.quantity} {f.unit}
                    {f.calories != null ? ` · ${Math.round(f.calories)} kcal` : ""}
                  </div>
                </div>
                <span className="plus-dot">
                  <Plus size={16} strokeWidth={2.2} />
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {matches.map((m) => (
        <button key={m.fdc_id || m.name} className="plus-row" onClick={() => logFood(m)}>
          <div className="grow">
            <div className="row-title">{m.name}</div>
            <div className="row-meta">
              {m.serving_label} · {m.source}
            </div>
          </div>
          <div className="row-right">
            <div className="kcal">{macros(m)}</div>
            <div className="source-tag">kcal</div>
          </div>
        </button>
      ))}

      <div className="section-label" id="food-logged">logged</div>
      {entries.length === 0 ? <p className="empty">tap a recent to log it</p> : null}
      <div className="list">
        {entries.map((e) => (
          <div key={e.id} className="row-item" onClick={() => setEditing(e)}>
            <div className="grow">
              <div className="row-title">{shortName(e.name)}</div>
              <div className="row-meta">
                {e.quantity} {e.unit} · {fmtTime(e.eaten_at, tz)}
                {e.is_example ? " · example" : ""}
              </div>
            </div>
            <div className="row-right">
              <div className="kcal">{macros(e)}</div>
              <div className="source-tag">{e.source}</div>
            </div>
            <div className="row-actions" onClick={(ev) => ev.stopPropagation()}>
              <button
                className="ghost-btn danger"
                aria-label="delete"
                onClick={async () => {
                  await api.deleteFood(e.id);
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

      <div className="section-label">from a sentence</div>
      <textarea
        className="search"
        rows={2}
        placeholder="2 eggs and a banana, 1 cup oats"
        value={parseText}
        onChange={(e) => setParseText(e.target.value)}
      />
      <button
        className="quiet"
        style={{ marginTop: 8 }}
        onClick={async () => {
          if (!parseText.trim()) return;
          const data = await api.parseFood(parseText.trim());
          setParsed(data);
          setConfirmItems(
            data.items.map((it) => ({
              ...it,
              chosen: it.matches[0] || null,
              quantity: it.parsed.quantity,
              unit: it.parsed.unit,
            })),
          );
        }}
      >
        parse
      </button>

      {confirmItems ? (
        <div style={{ marginTop: 12 }}>
          <p className="row-meta">confirm · parser {parsed?.parser}</p>
          {confirmItems.map((it, idx) => (
            <div key={idx} className="row-item" style={{ display: "block", height: "auto" }}>
              <div className="row-title">{it.parsed.name}</div>
              <div className="date-nav" style={{ margin: "8px 0" }}>
                <Qty
                  value={it.quantity}
                  onChange={(q) => {
                    const next = [...confirmItems];
                    next[idx] = { ...it, quantity: q };
                    setConfirmItems(next);
                  }}
                />
                <span className="row-meta">{it.unit}</span>
              </div>
              <select
                className="confirm-select"
                value={it.chosen?.fdc_id || ""}
                onChange={(e) => {
                  const chosen = it.matches.find((m) => m.fdc_id === e.target.value) || it.matches[0];
                  const next = [...confirmItems];
                  next[idx] = { ...it, chosen };
                  setConfirmItems(next);
                }}
              >
                {it.matches.map((m) => (
                  <option key={m.fdc_id} value={m.fdc_id}>
                    {m.name} · {Math.round(m.calories || 0)} kcal
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button
            className="primary block"
            onClick={async () => {
              const list = confirmItems
                .filter((it) => it.chosen)
                .map((it) => ({
                  ...it.chosen,
                  quantity: it.quantity,
                  unit: it.unit,
                }));
              if (!list.length) return toast("pick a USDA match");
              await api.addFood({ entries: list });
              toast("logged");
              setConfirmItems(null);
              setParseText("");
              load();
            }}
          >
            confirm & log
          </button>
        </div>
      ) : null}

      <div className="tail" aria-hidden="true" />

      {editing ? (
        <>
          <div className="backdrop" onClick={() => setEditing(null)} />
          <div className="sheet">
            <div className="grabber" />
            <div className="sheet-head">
              <div>
                <h3>{shortName(editing.name)}</h3>
                <p className="lede">{editing.unit}</p>
              </div>
              <button className="icon-btn" aria-label="close" onClick={() => setEditing(null)}>
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <Qty
              value={editing.quantity}
              onChange={(q) => setEditing({ ...editing, quantity: q })}
            />
            <div className="actions">
              <button
                className="primary"
                style={{ flex: 1 }}
                onClick={async () => {
                  await api.patchFood(editing.id, { quantity: editing.quantity });
                  setEditing(null);
                  toast("updated");
                  load();
                }}
              >
                save
              </button>
              <button
                className="quiet"
                onClick={async () => {
                  await api.addFavorite(editing);
                  toast("favorited");
                  load();
                }}
              >
                <Star size={16} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
