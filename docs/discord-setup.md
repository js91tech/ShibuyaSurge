# Discord Activity Setup

## 1. Application

1. Open https://discord.com/developers/applications
2. **New Application** → name: `Shibuya Surge` (or your choice)
3. Copy **Application ID** → `DISCORD_CLIENT_ID` and `VITE_DISCORD_CLIENT_ID`
4. **OAuth2** → add redirect: `https://127.0.0.1` (local) and your production URL
5. Copy **Client Secret** → `DISCORD_CLIENT_SECRET`

## 2. Activities

1. Left sidebar → **Activities**
2. Enable platforms: **Web**, **iOS**, **Android**
3. **URL Mappings** (example local tunnel):

| Prefix     | Target                    |
|------------|---------------------------|
| `/`        | `https://your-tunnel.trycloudflare.com` |
| `/.proxy`  | `https://your-tunnel.trycloudflare.com` |

4. Add **WebSocket mapping** for game server in production:

| Prefix | Target              |
|--------|---------------------|
| `/colyseus` | `wss://your-game.fly.dev` |

Update `VITE_GAME_SERVER_URL` to match your mapped WebSocket URL when not using localhost.

## 3. Scopes

The client requests:

- `identify`
- `rpc.activities.write` (Rich Presence)
- `rpc.voice.read` (optional voice context)

## 4. Local testing in Discord

```bash
# Terminal 1
pnpm dev:server

# Terminal 2
pnpm dev:client

# Terminal 3 — tunnel (example)
cloudflared tunnel --url http://localhost:5173
```

Paste tunnel URL into Discord URL mappings, then open Activity from a **test server** voice channel App Launcher.

## 5. Rich Presence assets

Upload 1024×1024 PNG/JPEG/WebP in **Rich Presence → Art Assets** for `setActivity` large/small images.

## 6. Instance verification

Production: remove `SKIP_INSTANCE_VERIFY`. Server calls Discord Instance Participants API before Colyseus `onAuth` succeeds.

## 7. Mobile QA checklist

- [ ] Safe area: buttons not under notch/home indicator
- [ ] Landscape combat readable
- [ ] Virtual joystick responsive
- [ ] Thermal: particles reduce under load (`THERMAL_STATE_UPDATE`)
- [ ] 2–4 player co-op in same voice channel instance
- [ ] WebSocket stable through `/.proxy` mapping
