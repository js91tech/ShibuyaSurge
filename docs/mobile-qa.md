# Mobile & Discord QA Pass

## Thermal scaling (implemented)

- Client subscribes to `THERMAL_STATE_UPDATE` via Embedded App SDK
- Levels map to `THERMAL_MULTIPLIERS` in `@jjk/game-core`
- `RunScene` caps visible enemies and scales sprites via `thermalEnemyCap` / `thermalParticleScale`
- `AudioManager.setMusicMuted` when thermal is `serious` or `critical`

## Safe areas (implemented)

- CSS variables: `--discord-safe-area-inset-*` with `env()` fallback in `global.css`
- HUD, joystick, and Domain button offset by safe insets

## Orientation (implemented)

- `setOrientationLockState` → landscape for Activity (when Discord client supports it)

## Co-op WebSocket

- Colyseus on same port as Express (`PORT`, default 3001)
- Room filtered by `instanceId` — players in same Discord Activity instance share one world
- `onAuth` verifies instance membership (disable only via `SKIP_INSTANCE_VERIFY=true` for local dev)

## Manual test matrix

| Device | Discord | Players | Pass criteria |
|--------|---------|---------|---------------|
| iPhone | iOS app | 2 | Lobby → run ≥5 min ≥30 FPS |
| Android mid | Android app | 2–4 | Revive + draft UI tappable |
| Desktop | Desktop | 4 | Boss spawn + results |
| Desktop | Browser dev | 1 | Dev mode mock auth |

## Proxy soak test (production)

1. Deploy server with `wss://` URL mapping in Developer Portal
2. Two clients in same voice channel → same `instanceId`
3. Monitor Colyseus disconnect rate over 15-minute run

## Known limits (slice)

- Procedural placeholder sprites (replace with atlases per `art-style-guide.md`)
- Web Audio procedural music (replace with `.ogg` stems for AA pass)
