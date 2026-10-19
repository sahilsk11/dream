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

- No passcode: locally the browser is admitted as `DEV_LOCAL_EMAIL` (127.0.0.1 only).
- Example data loads automatically on first request (`ALLOW_SEED=true`). Rows are tagged **EXAMPLE**.
- API token for curl: `dev-token-not-for-prod`

`npm run dev` builds the UI into `dist/`, applies D1 migrations locally, then starts Wrangler. For UI hot reload in another terminal: `npm run dev:web` (Vite on `:5173`, proxies `/api` to Wrangler).

## Auth

| Who | How |
| --- | --- |
| You, in the browser | Cloudflare Access only. The Worker verifies `Cf-Access-Jwt-Assertion` (team `ACCESS_TEAM_DOMAIN`, app `ACCESS_AUD`) and admits `ACCESS_ALLOWED_EMAILS`. No passcode. |
| homebot / HA / curl | Access service token headers (`CF-Access-Client-Id` / `CF-Access-Client-Secret`) **plus** `Authorization: Bearer $DREAM_API_TOKEN` (or `X-Api-Token`). Service-token JWTs carry no email, so the bearer is still required. |

## JSON API

Base URL: `https://dream.ultron.sh` (or `http://127.0.0.1:8787` locally).

All `/api/*` routes except `/api/health` require an allowed Access identity or the bearer token.

### Meta

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | `{ ok, name, tz, demo }` — public |
| GET | `/api/me` | `{ tz, today, example_data }` |
| GET | `/api/export` | dump sleep + food + weight + scale |
| POST | `/api/setup/seed` | reload EXAMPLE data (`ALLOW_SEED=true` only) |

### Sleep

Sessions are start/end intervals. A day is the **local date of `end_at`** (`DREAM_TZ`, default `America/New_York`), so overnight sleep and a next-day nap share the wake date. Any number of sessions per day (split nights, naps).

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
| POST | `/api/sync/sleep` | pull Home Assistant history now. Optional `{ hours }` or `?hours=` (default 36, max 14 days). Same Access / bearer auth |

Each session: `source` is `sensor` | `manual` | `edited`. Sensor ingest is **unconfirmed** until you confirm or edit.

#### Bed-sensor ingest (Home Assistant)

The Worker pulls HA history itself on the noon cron (after scale sync) and via `POST /api/sync/sleep`. It does **not** use `binary_sensor.bed_sensor_*_occupancy` (those flags get stuck). Sessions are built from pad pressure + out-of-bedroom motion + `person.sahil`, with no LLM.

- Pads read ~296 while he lies still and only **spike** above `SLEEP_PRESSURE_THRESHOLD` (default 330) for a few seconds when he moves. A stuck-high value is one rising edge, not occupancy — it never extends a session past sustained outside motion.
- A session **starts** at the first bed spike after the last living-room / kitchen / bathroom occupancy. It **continues** while he’s home and outside motion is not sustained (>3 min). It **ends** at the last bed spike just before that motion (or at the motion if there’s no wake spike).
- Require ≥20 min with no sustained outside motion. Ignore spikes while `person.sahil` is away. Naps count. Brief bathroom blips do not end a night.
- Stable `external_id` from the start time rounded to 5 minutes (`ha:sleep:<iso>`). Reruns update rather than duplicate.
- If there’s no outside motion since the last spike at sync time, the session is saved `in_progress` with `end_at` = now (“in bed until at least 12:00”). The next run extends or closes it.
- Sensor sessions stay unconfirmed. Edited / confirmed rows are never overwritten (same ingest rule as below).

`POST /api/ingest/sleep` still accepts pre-built intervals (homebot / debug):

```bash
curl -s http://127.0.0.1:8787/api/ingest/sleep \
  -H "Authorization: Bearer $DREAM_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "intervals": [
      {
        "external_id": "ha:sleep:2026-10-19T06:10:00.000Z",
        "start": "2026-10-19T06:12:00Z",
        "end": "2026-10-19T14:04:00Z"
      }
    ]
  }'
```

Also accepts a single `{ start, end, external_id, in_progress? }`. Response: `{ inserted, updated, skipped, decisions }`.

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

Manual entries and Wyze Scale X readings share the weight view (`source` is `manual` | `scale` | `edited`). Scale readings are trusted — no confirm flow. Weight is stored in kg from the scale and shown in lb.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/weight` | newest first; merges manual + scale, scale rows include `metrics` |
| POST | `/api/weight` | `{ lbs, weighed_at?, notes? }` |
| PATCH | `/api/weight/:id` | manual only (scale rows are not edited) |
| DELETE | `/api/weight/:id` | manual or scale |
| POST | `/api/ingest/weight` | `{ lbs }` or `{ kg }`, `{ weighed_at, external_id? }` — smart scale, idempotent |
| GET | `/api/scale` | `{ measurements, latest, previous, sync }` — full body-comp history |
| POST | `/api/sync/scale` | pull Wyze history now (same Access / bearer auth). First run backfills from 2015-01-01; later runs from last reading − 7 days |

Daily cron: `0 16 * * *` and `0 17 * * *` UTC, with a Worker guard that only runs when `America/New_York` local hour is 12 (EDT vs EST). At noon the Worker runs **scale sync, then sleep sync**; each is isolated so one failure does not skip the other. Wyze tokens live in D1 (`scale_sync_state`); refresh-first, login at most once per run (Wyze rate-limits login). Scale rows are upserted on the scale `data_id`. Sleep sync status lives in `sleep_sync_state`.

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
   npx wrangler secret put DREAM_API_TOKEN
   npx wrangler secret put USDA_API_KEY          # optional; DEMO_KEY is the default
   npx wrangler secret put WYZE_EMAIL
   npx wrangler secret put WYZE_PASSWORD
   npx wrangler secret put WYZE_KEY_ID
   npx wrangler secret put WYZE_API_KEY
   npx wrangler secret put HA_URL                # Home Assistant base URL, no trailing path
   npx wrangler secret put HA_TOKEN              # long-lived access token
   # optional:
   npx wrangler secret put LLM_API_KEY
   npx wrangler secret put WYZE_TOTP_SECRET      # authenticator MFA only
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
8. **Access:** Access app `dream` (sahilsk11/cloudflare, `allow_sahil` + service auth, no bypass) is the only browser gate. Agents send the `ultron-agents` service token headers plus the bearer token. If the Access app is recreated, update `ACCESS_AUD` in `wrangler.toml`.

USDA: get a free key at [api.data.gov](https://api.data.gov/signup/) if `DEMO_KEY` rate-limits.

## Home Assistant sketch

The Worker GETs `/api/history/period/<start>?filter_entity_id=...&end_time=...` with `HA_URL` + `HA_TOKEN` (~36 hours, noon NY cron plus `POST /api/sync/sleep`). Do not use `binary_sensor.bed_sensor_*_occupancy`. `SLEEP_PRESSURE_THRESHOLD` is a Worker var (default `330`). `POST /api/ingest/sleep` remains for pushing pre-built intervals. Do not send overlapping guesses on top of a night you already edited in the app.

## Product notes

- Sleep sensor data is treated as a **suggestion**: unconfirmed until you confirm or drag/edit.
- Food recents/favorites are one tap. Barcode uses Open Food Facts. Typed meals go through parse → USDA match → confirm.
- Weight is a number and a log. Trend line is a sparkline, not a dashboard.
- Wyze Scale X readings are **trusted** (`source=scale`): no confirm flow. Manual lbs logging still works; the weight view merges both. Body-comp metrics (fat, muscle, water, visceral fat, BMI, BMR, bone, protein, metabolic age) come from the scale and are stored in kg. Display is lb. Tokens live in D1 and are refreshed; login is never retried in a loop.
