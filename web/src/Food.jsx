import React, { useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { addDays, fmtDay, fmtTime } from "./time.js";

function Qty({ value, onChange }) {
  return (
    <div className="qty">
      <button type="button" onClick={() => onChange(Math.max(0.25, Math.round((value - 0.5) * 100) / 100))}>
        –
      </button>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
      <button type="button" onClick={() => onChange(Math.round((value + 0.5) * 100) / 100)}>
        +
      </button>
    </div>
  );
}

function macros(item) {
  const kcal = item.calories != null ? `${Math.round(item.calories)} kcal` : "— kcal";
  return kcal;
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
    toast(`logged ${food.name.split(" · ")[0]}`);
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
      <div className="card">
        <div className="row date-nav">
          <button className="ghost" onClick={() => setDate(addDays(date, -1))}>‹</button>
          <div>
            <h2>food</h2>
            <p className="sub">
              {fmtDay(date, tz)}
              {totals ? ` · ${Math.round(totals.calories)} kcal` : ""}
            </p>
          </div>
          <button className="ghost" onClick={() => setDate(addDays(date, 1))}>›</button>
        </div>

        <input
          className="search"
          placeholder="search USDA…"
          value={q}
          onChange={(e) => search(e.target.value)}
        />

        <div className="scan-row">
          <input
            className="search"
            style={{ margin: 0 }}
            placeholder="barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && barcode.trim()) scanCode(barcode.trim());
            }}
          />
          <button className="quiet" onClick={() => fileRef.current?.click()}>
            scan
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

        {favorites.length ? (
          <>
            <p className="sub" style={{ marginTop: 12 }}>
              favorites
            </p>
            <div>
              {favorites.map((f) => (
                <button key={f.id} className="chip starred" onClick={() => logFood({ ...f, source: f.source || "usda" })}>
                  {f.name.replace(/^EXAMPLE · /, "")}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {recents.length ? (
          <>
            <p className="sub">recents — one tap</p>
            <div>
              {recents.map((f) => (
                <button key={f.id} className="chip" onClick={() => logFood({ ...f, source: f.source || "usda" })}>
                  {f.name.replace(/^EXAMPLE · /, "")}
                  <span className="source-tag">{f.quantity} {f.unit}</span>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {matches.map((m) => (
          <div key={m.fdc_id || m.name} className="match">
            <div>
              <div className="entry-name">{m.name}</div>
              <div className="sub">
                {m.serving_label} · <span className="source-tag">{m.source}</span>
              </div>
            </div>
            <div>
              <div className="kcal">{macros(m)}</div>
              <button className="primary" style={{ marginTop: 6, padding: "8px 12px" }} onClick={() => logFood(m)}>
                log
              </button>
            </div>
          </div>
        ))}

        <p className="sub" style={{ marginTop: 16 }}>
          type a meal — numbers still come from USDA after you confirm
        </p>
        <textarea
          className="search"
          rows={2}
          placeholder="2 eggs and a banana, 1 cup oats"
          value={parseText}
          onChange={(e) => setParseText(e.target.value)}
        />
        <button
          className="quiet"
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
            <p className="sub">confirm · parser {parsed?.parser}</p>
            {confirmItems.map((it, idx) => (
              <div key={idx} className="session">
                <div className="entry-name">{it.parsed.name}</div>
                <div className="row" style={{ margin: "8px 0" }}>
                  <Qty
                    value={it.quantity}
                    onChange={(q) => {
                      const next = [...confirmItems];
                      next[idx] = { ...it, quantity: q };
                      setConfirmItems(next);
                    }}
                  />
                  <span className="sub">{it.unit}</span>
                </div>
                <select
                  value={it.chosen?.fdc_id || ""}
                  onChange={(e) => {
                    const chosen = it.matches.find((m) => m.fdc_id === e.target.value) || it.matches[0];
                    const next = [...confirmItems];
                    next[idx] = { ...it, chosen };
                    setConfirmItems(next);
                  }}
                  style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #ddd" }}
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
              className="primary"
              style={{ width: "100%" }}
              onClick={async () => {
                const entries = confirmItems
                  .filter((it) => it.chosen)
                  .map((it) => ({
                    ...it.chosen,
                    quantity: it.quantity,
                    unit: it.unit,
                  }));
                if (!entries.length) return toast("pick a USDA match");
                await api.addFood({ entries });
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
      </div>

      <div className="card">
        <h2>logged</h2>
        <p className="sub">tap qty to edit · delete if it's wrong</p>
        {entries.map((e) => (
          <div key={e.id} className="session">
            <div className="row">
              <div className="grow">
                <div className="entry-name">{e.name.replace(/^EXAMPLE · /, "")}</div>
                <div className="sub">
                  {e.quantity} {e.unit} · {fmtTime(e.eaten_at, tz)}
                  {e.is_example ? " · EXAMPLE" : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="kcal">{macros(e)}</div>
                <div className="source-tag">{e.source}</div>
              </div>
            </div>
            <div className="actions">
              <button className="quiet" onClick={() => setEditing(e)}>
                qty
              </button>
              <button
                className="quiet"
                onClick={async () => {
                  await api.addFavorite(e);
                  toast("favorited");
                  load();
                }}
              >
                ★
              </button>
              <button
                className="danger"
                onClick={async () => {
                  await api.deleteFood(e.id);
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
            <h3>{editing.name.replace(/^EXAMPLE · /, "")}</h3>
            <div className="row">
              <Qty
                value={editing.quantity}
                onChange={(q) => setEditing({ ...editing, quantity: q })}
              />
              <span>{editing.unit}</span>
            </div>
            <button
              className="primary"
              style={{ width: "100%", marginTop: 16 }}
              onClick={async () => {
                await api.patchFood(editing.id, { quantity: editing.quantity });
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
