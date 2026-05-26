/**
 * Stage variants — picked at run start. Each one gets its own floor texture
 * (loaded by `BootScene` from `/textures/floor_<id>.png`), tinted mood
 * palette, balance tweaks, and — crucially — its own enemy + boss pool so
 * playing different stages actually feels mechanically distinct.
 */
export const STAGES = [
    {
        id: "shibuya_crossing",
        name: "Shibuya Crossing",
        blurb: "Cursed energy floods the intersection. Charger + flyer rush.",
        floorTexture: "floor_shibuya",
        floorTint: 0x000000,
        floorAlpha: 0,
        bossTint: 0x7f1d1d,
        domainTint: 0x4c1d95,
        spawnRateMul: 1,
        bossHpMul: 1,
        // Open street — fast attackers and exploders harass from all sides.
        enemyPool: ["charger", "flyer", "swarm", "exploder", "ranged"],
        // Shibuya is the climactic JJK stage — Sukuna headlines, with Jogo as
        // the alternate special grade.
        bossPool: ["boss_jogo", "boss_sukuna"],
        bossLabel: "King of Curses",
        // E-minor chord (E2 / G2 / B2) — urban-cinematic, slightly tense; triangle
        // wave gives a faint synth edge over the warm sine pad.
        music: {
            chord: [82.41, 98.0, 123.47],
            cutoff: { calm: 540, combat: 980, boss: 1500 },
            lfo: { calm: 0.07, combat: 0.13, boss: 0.2 },
            wave: "triangle",
            trackUrl: "audio/stage_shibuya.wav",
        },
        ambience: { kind: "neon_rain", color: 0xa78bfa, density: 0.7 },
    },
    {
        id: "subway",
        name: "Subway Tunnel",
        blurb: "Claustrophobic. Tanks + swarms. Spawn rate +15%, boss HP −10%.",
        floorTexture: "floor_subway",
        floorTint: 0x0b1020,
        floorAlpha: 0.4,
        bossTint: 0x991b1b,
        domainTint: 0x312e81,
        spawnRateMul: 1.15,
        bossHpMul: 0.9,
        // Tight space — slow tanks corner the player while swarms gum up footing.
        enemyPool: ["tank", "swarm", "swarm", "charger"],
        // Subway = close-quarters brawl. Toji's Heavenly Restriction physique
        // fits the cramped space; Mahito stays as a soul-warping alternate.
        bossPool: ["boss_mahito", "boss_toji"],
        bossLabel: "Soul Sculptor",
        // A-minor add9 dropped an octave low — claustrophobic, sub-bass weight.
        music: {
            chord: [55.0, 65.41, 73.42],
            cutoff: { calm: 360, combat: 720, boss: 1100 },
            lfo: { calm: 0.05, combat: 0.09, boss: 0.16 },
            wave: "sine",
            trackUrl: "audio/stage_subway.wav",
        },
        ambience: { kind: "dust", color: 0x9ca3af, density: 0.5 },
    },
    {
        id: "cursed_forest",
        name: "Cursed Forest",
        blurb: "Quieter opening, denser late. Ranged + flyers. Boss HP +25%.",
        floorTexture: "floor_forest",
        floorTint: 0x052e16,
        floorAlpha: 0.45,
        bossTint: 0x064e3b,
        domainTint: 0x14532d,
        spawnRateMul: 0.9,
        bossHpMul: 1.25,
        // Tree cover — long-range threats and aerial harassment dominate.
        enemyPool: ["ranged", "flyer", "ranged", "exploder"],
        // Cursed Forest = curse-user territory. Geto fits naturally as the
        // long-range manipulator alternate to Hanami.
        bossPool: ["boss_hanami", "boss_geto"],
        bossLabel: "Verdant Special Grade",
        // D-major-ish open voicing — D2 / F#2 / A2 / D3. Wider/airy.
        music: {
            chord: [73.42, 92.5, 110.0, 146.83],
            cutoff: { calm: 700, combat: 1100, boss: 1600 },
            lfo: { calm: 0.05, combat: 0.1, boss: 0.16 },
            wave: "sine",
            trackUrl: "audio/stage_forest.wav",
        },
        ambience: { kind: "leaves", color: 0xfde68a, density: 0.6 },
    },
    {
        id: "goodwill_event",
        name: "Goodwill Event",
        blurb: "Crowded venue. Mixed mob. Spawn rate +25%, boss HP −15%.",
        floorTexture: "floor_goodwill",
        floorTint: 0x431407,
        floorAlpha: 0.35,
        bossTint: 0xb45309,
        domainTint: 0x6d28d9,
        spawnRateMul: 1.25,
        bossHpMul: 0.85,
        // Festival chaos — random rotating cast pulled from the full bestiary.
        enemyPool: ["flyer", "charger", "swarm", "tank", "ranged", "exploder"],
        // Goodwill = the chaos stage — full boss roster including villains.
        bossPool: [
            "boss_jogo",
            "boss_hanami",
            "boss_mahito",
            "boss_sukuna",
            "boss_geto",
            "boss_toji",
        ],
        bossLabel: "Special Grade",
        // F-major triad (F2 / A2 / C3) — warmer, brighter than the others.
        music: {
            chord: [87.31, 110.0, 130.81],
            cutoff: { calm: 820, combat: 1300, boss: 1800 },
            lfo: { calm: 0.08, combat: 0.15, boss: 0.22 },
            wave: "triangle",
            trackUrl: "audio/stage_goodwill.wav",
        },
        ambience: { kind: "confetti", color: 0xf472b6, density: 0.85 },
    },
];
const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));
export function getStage(id) {
    return STAGE_BY_ID.get(id);
}
export const DEFAULT_STAGE = "shibuya_crossing";
