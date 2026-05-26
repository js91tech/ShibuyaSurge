# Art Style Guide — AA 2D (Web)

## Direction

Anime-cel **JJK fan aesthetic**: dark Shibuya night, neon curse purple/red accents, crisp 2px outlines, readable at 48×48 thumbnail.

## Specs

| Asset | Size | Format |
|-------|------|--------|
| Hero frame | 128×128 | PNG in atlas |
| Enemy | 64–96 | PNG in atlas |
| UI | @2x → scale down | PNG |
| Rich Presence | 1024×1024 | PNG/JPEG |

## Palette

- Background: `#0a0e1a`, `#1e293b` grid
- Curse aura: `#9b7bff`, `#c084fc`
- Danger: `#ef4444`
- Hero accents: per character in `game-core`

## Pipeline

1. Concept (AI + paint-over) → `docs/art-prompts.md`
2. Aseprite animation sheets
3. TexturePacker → `assets/atlases/*.json`
4. Phaser `load.atlas` (replace procedural textures in `BootScene`)

## Current slice

Procedural Phaser textures in `BootScene.ts` match palette and silhouettes until atlases land.

## Quality bar

- Silhouette readable on mobile
- No muddy gradients on small sprites
- Hit-stop + domain ring VFX synced to server events
