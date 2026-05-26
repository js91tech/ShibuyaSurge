# Ship to GitHub + Railway

This is the production path for the Shibuya Surge Discord Activity. The
**server** (Express + Colyseus + Postgres) lives on Railway; the **static
client** can sit on Cloudflare Pages / Vercel / GitHub Pages — any static
host that can serve a Vite build.

```
┌──────────────────────────┐    HTTPS/WSS    ┌────────────────────────────┐
│  Discord Activity iframe │ ───────────────▶│  Static client (CF Pages)  │
│  *.discordsays.com       │                 └────────────────────────────┘
│                          │
│   URL Mappings:          │                 ┌────────────────────────────┐
│   /        → client      │  /.proxy/api    │  Railway service           │
│   /.proxy  → client      │ ───────────────▶│  Express + Colyseus + tsx  │
│   /colyseus → wss server │  /.proxy/colyseus│  PostgreSQL plugin        │
└──────────────────────────┘                 └────────────────────────────┘
```

## 1. Push the repo to GitHub

From `jjk-survivors/` (repo root):

```bash
git init
git add .
git commit -m "Initial commit"

# Option A: gh CLI
gh repo create shibuya-surge --public --source=. --remote=origin --push

# Option B: GitHub UI
#   1. New repo on github.com (don't add README/.gitignore — we have them)
#   2. git remote add origin https://github.com/<you>/shibuya-surge.git
#   3. git branch -M main
#   4. git push -u origin main
```

Sanity-check: `git status` should report a clean tree; `apps/server/data/`,
`node_modules/`, `dist/`, `.env`, and `terminals/` are all in
[`.gitignore`](../.gitignore).

## 2. Provision the Railway service

1. https://railway.app → **New Project** → **Deploy from GitHub repo** → pick
   the freshly-created repo.
2. Railway reads [`railway.json`](../railway.json) and uses NIXPACKS with our
   `build:server` / `start:server` scripts. No Dockerfile needed — the
   pre-existing `Dockerfile` is only used for Fly.io and can be ignored.
3. While the first build runs, click **New** in the project canvas → **Database**
   → **Add PostgreSQL**. Railway auto-injects `DATABASE_URL` into every service
   in the project. The server detects this at boot and switches from the
   JSON-file store to `PgMetaStore` (the `profiles` table is created on first
   run via `CREATE TABLE IF NOT EXISTS`).
4. In the service **Variables** tab, set:

   | Variable                | Value                                                          |
   | ----------------------- | -------------------------------------------------------------- |
   | `DISCORD_CLIENT_ID`     | Application ID from the Developer Portal                       |
   | `DISCORD_CLIENT_SECRET` | OAuth2 → Reset Secret                                          |
   | `CLIENT_URL`            | `https://<your-pages>.pages.dev` (comma-separated for previews) |
   | `NODE_ENV`              | `production`                                                   |

   `DATABASE_URL` and `PORT` are auto-injected by Railway — do not set them
   yourself. `SKIP_INSTANCE_VERIFY` should be **unset** in production.

5. After the deploy finishes Railway exposes a public URL like
   `https://shibuya-surge-production.up.railway.app`. Copy it.

## 3. Static client hosting (Cloudflare Pages example)

This step is outside Railway's scope but here for completeness — any static
host works.

1. Cloudflare Pages → **Create project** → connect the same GitHub repo.
2. Build settings:
   - **Framework preset:** None
   - **Build command:** `npm ci && npm run build -w @jjk/game-core -w @jjk/shared-protocol -w @jjk/client`
   - **Output directory:** `apps/client/dist`
3. Environment variables:

   | Variable                  | Value                                                         |
   | ------------------------- | ------------------------------------------------------------- |
   | `VITE_DISCORD_CLIENT_ID`  | Same Application ID as the server                             |
   | `VITE_GAME_SERVER_URL`    | `wss://shibuya-surge-production.up.railway.app` (use **wss**) |

4. Deploy → note the `*.pages.dev` URL.

## 4. Register URLs with Discord

Discord Developer Portal → **your application** → **Activities** → **URL
Mappings**.

| Prefix      | Target                                                  |
| ----------- | ------------------------------------------------------- |
| `/`         | `https://<your-pages>.pages.dev`                        |
| `/.proxy`   | `https://<your-pages>.pages.dev`                        |
| `/colyseus` | `wss://shibuya-surge-production.up.railway.app`         |

Also add an OAuth2 redirect for the same Pages URL (and `https://127.0.0.1`
for local).

The client auto-detects `*.discordsays.com` at runtime and switches its meta
API base to `/.proxy/api`, so meta saves flow through Discord's proxy under
the `/.proxy` mapping.

## 5. Smoke test

1. Open the Activity from a test server's voice channel **App Launcher**.
2. Play a solo run → return to the menu. The Talisman count should persist
   on next session (now backed by Postgres).
3. In Railway → **Postgres → Data**, run:

   ```sql
   SELECT user_id, jsonb_pretty(data), updated_at FROM profiles ORDER BY updated_at DESC LIMIT 5;
   ```

   You should see a row with `user_id = 'discord:<your-id>'`.

## Local development is unchanged

- `apps/server/data/meta.json` is intentionally gitignored — production reads
  and writes Postgres, local dev reads and writes the JSON file with the same
  exact API surface (`MetaStore` interface in `apps/server/src/storage/`).
- `npm run dev:solo` runs solely against the client and the JSON file; no
  Discord, no Postgres.
- `npm run dev` runs server + client, still falling back to JSON when
  `DATABASE_URL` is unset.
- If you want to test the Postgres path locally:

  ```bash
  docker run --rm -p 5432:5432 -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=jjk postgres:16
  # in another shell
  DATABASE_URL=postgres://postgres:dev@localhost:5432/jjk PGSSLMODE=disable npm run dev:server
  ```

  Watch for `[meta] using PgMetaStore` in the boot log. If the Postgres
  bootstrap fails, the server logs a warning and falls back to JSON so dev
  keeps working.
