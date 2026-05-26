# Jujutsu Exorcism: Shibuya Surge

Co-op JJK bullet-heaven roguelike built as a **Discord Activity** (web iframe on desktop, web, and mobile Discord).

## Stack

- **Client:** React 19 + Vite + Phaser 3 + `@discord/embedded-app-sdk`
- **Server:** Express (OAuth) + Colyseus (authoritative co-op)
- **Packages:** `@jjk/game-core`, `@jjk/shared-protocol`

## Custom sprites

Character, enemy, and pickup art live in the workspace [`assets/`](../assets/) folder (PNG). The client loads them via `apps/client/src/game/spriteAssets.ts` (Vite bundles them in dev and build).

To refresh art: replace PNGs in `assets/`, then restart `npm run dev:solo`. Optional copy to `public/` for static hosting: `node tooling/copy-sprites.mjs`.

Walk/idle animations are built at runtime in `spriteAnims.ts` (4–6 bob frames per sprite from each PNG). Replace the source PNGs to change how the cycles look.

## Quick start

```bash
cd jjk-survivors
npm install
```

**Play Solo (no server, no Discord):**

```bash
npm run dev:solo
```

Open http://localhost:5173 → **Play Solo** → pick sorcerer → Start.

**Online / Discord (optional):**

```bash
copy .env.example .env
npm run dev
```

### Test on your phone (LAN)

The fastest way to playtest on a real phone or tablet is to expose Vite to your local network and open it from the device's browser.

```bash
# Same Wi-Fi as your phone
npm run dev:mobile
```

That binds Vite to `0.0.0.0:5173`. Vite prints the LAN URL on startup, e.g.

```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.42:5173/    ← open this on your phone
```

Open the `Network` URL in Safari / Chrome on the phone. The HUD auto-detects touch and shows the joystick, dash, and domain buttons. If you don't see the network URL:

1. Allow Node through Windows Firewall (first run usually prompts), or temporarily disable the Defender firewall on your private network.
2. Check both devices are on the same Wi-Fi (and not on a guest/AP-isolated network).
3. Find your LAN IP: `ipconfig` on Windows, `ifconfig`/`ipconfig getifaddr en0` on macOS.

### Test on phone over a public tunnel (works on 4G/5G too)

When LAN isn't an option (different networks, hotel Wi-Fi, demoing to a friend), use a tunnel:

```bash
# In one terminal
npm run dev:mobile

# In another, with cloudflared (no signup needed)
cloudflared tunnel --url http://localhost:5173
```

Cloudflare prints a public `https://*.trycloudflare.com` URL — open it on the phone. `ngrok http 5173` works the same way. This is also how you'd test the Discord Activity from mobile Discord.

### Building a phone-installable version (PWA)

There's no PWA manifest yet — running `dev:mobile` (or `npm run build` + `npm run preview`) in a browser is the recommended way to test on mobile right now. If you want a "Add to Home Screen" prompt, ask and we can wire a minimal `manifest.webmanifest` + service worker.


### npm `ETARGET` on Colyseus

Pinned versions (must match): `colyseus@0.15.57`, `@colyseus/schema@2.0.37`, `colyseus.js@0.15.28`. Do not use `colyseus@0.17` with schema v2 — that causes `$changes` import errors.

If install acts up after version changes, delete `node_modules` and `package-lock.json`, then run `npm install` again.

Uses **npm workspaces** (not pnpm). Run `npm install` once at the repo root before `npm run dev`.

- Client: http://localhost:5173
- Server + Colyseus: http://localhost:3001 (WebSocket on same port)

### Dev without Discord

Leave `VITE_DISCORD_CLIENT_ID` unset or as placeholder — the client runs in **dev mode** with a mock user and `SKIP_INSTANCE_VERIFY=true` on the server (default in non-production).

```bash
# apps/server — .env
SKIP_INSTANCE_VERIFY=true
```

## Discord Activity setup

See [docs/discord-setup.md](docs/discord-setup.md).

1. Create an application at https://discord.com/developers/applications
2. Enable **Activities** (Web, iOS, Android)
3. Set URL Mapping: `/.proxy` → your tunnel/host
4. OAuth redirect for local dev (see Discord getting-started guide)
5. Map `wss://` game server URL to your Colyseus host in production

Launch the Activity from a voice channel **App Launcher** while developing with [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) or similar.

## Gameplay

- **Lobby:** 4 canon sorcerers, ready up, host starts
- **Run:** 12-minute Shibuya survival, co-op revive, shared camera
- **Draft:** Level-up technique picks (12 cards)
- **Domain:** Once per run ultimate (one active domain per party)
- **Boss:** Special-grade spirit at 3:00 or timer end

## Project layout

```
apps/client     — Discord shell + Phaser
apps/server     — OAuth + Colyseus ShibuyaRoom
packages/*      — Shared game data & schemas
docs/           — GDD, art pipeline, Discord guide
assets/         — Atlases & UI (see docs/art-style-guide.md)
```

## Production deploy

See [`docs/deploy-railway.md`](docs/deploy-railway.md) for the full
step-by-step (GitHub → Railway service + Postgres → Discord URL Mappings →
static client host).

Quick shape:

- **Server (Express + Colyseus):** Railway service from this repo via
  [`railway.json`](railway.json). Postgres plugin auto-injects
  `DATABASE_URL` → server uses `PgMetaStore` (table auto-created), falls back
  to a local JSON file when unset.
- **Static client (Vite build):** Cloudflare Pages / Vercel / any CDN.
- **Discord:** URL Mappings point `/` and `/.proxy` at the client host and
  `/colyseus` at the Railway WebSocket URL.

The legacy `Dockerfile` and `fly.toml` are kept for Fly.io but the supported
path is Railway.

## Legal

Non-commercial fan tribute. JJK characters and terms © their respective owners.
