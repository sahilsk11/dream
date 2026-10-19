# DREAM

**DATA RULES EVERYTHING AROUND ME**

Sahil's personal tracker for **sleep, food, and weight**. Single-user. Built for dead-easy phone entry so homebot can do the reading.

Live target: `https://dream.ultron.sh`

This is not a general product. There is no AI insights page. The old gym visualizer (React + Express + Mongo) is replaced.

## Stack

- **UI:** React + Vite, dark mobile-first CSS. Old DREAM DNA (`#362566` purple, `#6466FF` / `#7c80ff` indigo) used as accents on a near-black base, Inter, lucide icons, no clipart.
- **API:** Cloudflare Worker (Hono)
- **DB:** Cloudflare D1 (SQLite)
- **Food numbers:** USDA FoodData Central search + Open Food Facts barcodes. An LLM, if configured, may only parse a sentence into `{name, quantity, unit}` — never calories.

## Local

```bash
npm install
cp .dev.vars.example .dev.vars
npm test
npm run typecheck
npm run dev
```

Open `http://127.0.0.1:8787`

- Passcode: `2468` (from `.dev.vars`)
- Example data loads automatically on first login (`ALLOW_SEED=true`). Rows are tagged **EXAMPLE**.
- API token for curl: `dev-token-not-for-prod`

`npm run dev` builds the UI into `dist/`, applies D1 migrations locally, then starts Wrangler. For UI hot reload in another terminal: `npm run dev:web` (Vite on `:5173`, proxies `/api` to Wrangler).

## Auth

| Who | How |
| --- | --- |
| You, in the browser | Passcode → httpOnly cookie (`POST /api/login`) |
| homebot / HA / curl | `Authorization: Bearer $DREAM_API_TOKEN` (or `X-Api-Token`) |

## JSON API

Base URL: `https://dream.ultron.sh` (or `http://127.0.0.1:8787` locally).

All `/api/*` routes except `/api/health` and `/api/login` require cookie or bearer token.

### Meta

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | `{ ok, name, tz, demo }` — public |
| POST | `/api/login` | `{ "passcode": "…" }` → sets cookie |
| POST | `/api/logout` | clears cookie |
| GET | `/api/me` | `{ tz, today, example_data }` |
| GET | `/api/export` | dump sleep + food + weight |
| POST | `/api/setup/seed` | reload EXAMPLE data (`ALLOW_SEED=true` only) |

### Sleep

Sessions are start/end intervals. A day is the **local date of `end_at`** (`DREAM_TZ`, default `America/Los_Angeles`), so overnight sleep and a next-day nap share the wake date. Any number of sessions per day (split nights, naps).

| Method | Path | Body / query |
| --- | --- | --- |
| GET | `/api/sleep?date=YYYY-MM-DD` | that day's sessions |
| GET | `/api/sleep?from=&to=` | ISO range (homebot) |
| POST | `/api/sleep` | `{ start_at, end_at, notes? }` — manual, confirmed |
| PATCH | `/api/sleep/:id` | `{ start_at?, end_at?, notes? }` — editing a sensor session marks `source=edited` |
| DELETE | `/api/sleep/:id` | |
| POST | `/api/sleep/:id/confirm` | sensor → confirmed, still `source=sensor` |
| POST | `/api/sleep/:id/split` | `{ at }` ISO time inside the session |
| POST | `/api/sleep/merge` | `{ a, b }` ids |
| POST | `/api/ingest/sleep` | see below |

Each session: `source` is `sensor` | `manual` | `edited`. Sensor ingest is **unconfirmed** until you confirm or edit.

#### Bed-sensor ingest (Home Assistant)

Idempotent. Edited / confirmed sessions win; a matching `external_id` will not be clobbered.

```bash
curl -s http://127.0.0.1:8787/api/ingest/sleep \
  -H "Authorization: Bearer $DREAM_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "intervals": [
      {
        "external_id": "ha:binary_sensor.bed_occupancy:2026-10-19T06:12:00Z",
        "start": "2026-10-19T06:12:00Z",
        "end": "2026-10-19T14:04:00Z"
      }
    ]
  }'
```

Also accepts a single `{ start, end, external_id }`. Response: `{ inserted, updated, skipped, decisions }`.

Use occupancy **intervals** (on→off), not raw pressure. `bs.ultron.sh` is the debug UI for the bed sensor; this ingest is the write path into DREAM.

### Food

Calories/macros only from USDA or Open Food Facts. Recents/favorites one-tap reuse the last database snapshot.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/food?date=YYYY-MM-DD` | `{ entries, totals }` |
| GET | `/api/food/recents` | last unique foods |
| GET | `/api/food/favorites` | |
| POST | `/api/food/favorites` | snapshot body |
| DELETE | `/api/food/favorites/:id` | |
| GET | `/api/food/search?q=` | USDA FoodData Central |
| GET | `/api/food/barcode/:code` | Open Food Facts |
| POST | `/api/food/parse` | `{ text }` → items + USDA matches (**confirm in UI before save**) |
| POST | `/api/food` | one food object or `{ entries: [...] }` |
| PATCH | `/api/food/:id` | `{ quantity, unit? }` rescales macros |
| DELETE | `/api/food/:id` | |

`source` on each entry is a subtle tag: `usda` / `off` / `recent` / `favorite`.

Optional LLM parse (still no numbers from the model):

```
LLM_API_KEY=…
LLM_BASE_URL=https://api.openai.com/v1   # optional
LLM_MODEL=gpt-4o-mini                    # optional
```

Without those, a rules parser splits `2 eggs and a banana, 1 cup oats`.

### Weight

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/weight` | newest first |
| POST | `/api/weight` | `{ lbs, weighed_at?, notes? }` |
| PATCH | `/api/weight/:id` | |
| DELETE | `/api/weight/:id` | |
| POST | `/api/ingest/weight` | `{ lbs }` or `{ kg }`, `{ weighed_at, external_id? }` — smart scale, idempotent |

## Deploy to dream.ultron.sh

Do **not** deploy from this PR until you want it live. Account is the same Cloudflare account as `bs.ultron.sh` (`account_id` is already in `wrangler.toml`).

1. **Login**
   ```bash
   npx wrangler login
   ```
2. **Create D1**
   ```bash
   npx wrangler d1 create dream
   ```
   Paste the printed `database_id` into `wrangler.toml` (replace the placeholder `00000000-0000-4000-8000-000000000001`).
3. **Migrate**
   ```bash
   npx wrangler d1 migrations apply dream --remote
   ```
4. **Secrets** (never commit these)
   ```bash
   npx wrangler secret put DREAM_PASSCODE
   npx wrangler secret put DREAM_API_TOKEN
   npx wrangler secret put USDA_API_KEY          # optional; DEMO_KEY is the default
   # optional:
   npx wrangler secret put LLM_API_KEY
   ```
5. **Keep production from reseeding**
   `ALLOW_SEED` is `"false"` in `[vars]`. Leave it that way on the Worker.
6. **Build + deploy**
   ```bash
   npm run deploy
   ```
   `wrangler.toml` already binds custom domain `dream.ultron.sh` on zone `ultron.sh` (same pattern as `bs.ultron.sh` / `mailbox.ultron.sh`). First deploy will attach the hostname if your token can edit DNS.
7. **If DNS is Terraform-owned** (`sahilsk11/cloudflare`), add the same placeholder used for `bs`:
   ```hcl
   resource "cloudflare_dns_record" "dream" {
     zone_id = var.zone_id
     name    = "dream"
     type    = "AAAA"
     content = "100::"
     proxied = true
     ttl     = 1
   }
   resource "cloudflare_workers_custom_domain" "dream" {
     account_id = var.account_id
     zone_id    = var.zone_id
     hostname   = "dream.ultron.sh"
     service    = "dream"
   }
   ```
   Leave `custom_domain` in this repo's `wrangler.toml` so a deploy does not detach the hostname.
8. **Access:** `*.ultron.sh` is currently a Sahil-only wildcard. This app is meant to be reachable with **passcode + API token** (homebot, HA). Either:
   - add an Access **bypass** app for `dream.ultron.sh` (recommended for ingest), or
   - keep Access and send `CF-Access-Client-Id` / `CF-Access-Client-Secret` plus the bearer token from homebot.

USDA: get a free key at [api.data.gov](https://api.data.gov/signup/) if `DEMO_KEY` rate-limits.

## Home Assistant sketch

On occupancy falling edge, POST the occupied interval to `/api/ingest/sleep`. Keep a unique `external_id` per interval so retries are safe. Do not send overlapping guesses on top of a night you already edited in the app.

## Product notes

- Sleep sensor data is treated as a **suggestion**: unconfirmed until you confirm or drag/edit.
- Food recents/favorites are one tap. Barcode uses Open Food Facts. Typed meals go through parse → USDA match → confirm.
- Weight is a number and a log. Trend line is a sparkline, not a dashboard.
