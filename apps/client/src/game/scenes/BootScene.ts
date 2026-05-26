import Phaser from "phaser";
import { SPRITE_URLS } from "../spriteAssets";
import { registerSpriteAnims } from "../spriteAnims";
import { cleanAllSpriteTextures } from "../spriteCleanup";
import { STAGES } from "@jjk/game-core";
import { audioManager } from "../../audio/AudioManager";

/** Loads custom PNG sprites + procedural VFX textures */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    for (const [key, url] of Object.entries(SPRITE_URLS)) {
      this.load.image(key, url);
    }
    // Arena floor textures — one per stage, tiled across the background.
    // Keep `arena_floor` for legacy code paths that hard-code the key
    // (e.g. fallback when no stage is selected).
    this.load.image("arena_floor", "textures/arena_floor.png");
    this.load.image("floor_shibuya", "textures/floor_shibuya.png");
    this.load.image("floor_subway", "textures/floor_subway.png");
    this.load.image("floor_forest", "textures/floor_forest.png");
    this.load.image("floor_goodwill", "textures/floor_goodwill.png");
    this.generateVfxTextures();
  }

  /** Particles, glow & projectile shapes — all procedural so no art pipeline needed. */
  private generateVfxTextures() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    for (const [key, color, size] of [
      ["particle_hit", 0xffffff, 4],
      ["particle_spark", 0xc084fc, 5],
      ["particle_curse", 0x7c3aed, 6],
      ["particle_elite", 0xf472b6, 7],
      ["particle_boss", 0xef4444, 9],
    ] as const) {
      g.clear();
      g.fillStyle(color, 1);
      g.fillCircle(size, size, size);
      g.generateTexture(key, size * 2, size * 2);
    }

    // Tight player aura — much smaller than the old 96px halo that was bleeding
    // huge pale circles into the arena.
    g.clear();
    g.fillStyle(0xffffff, 0.18);
    g.fillCircle(28, 28, 26);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(28, 28, 16);
    g.generateTexture("player_glow", 56, 56);

    g.clear();
    for (let i = 0; i < 3; i++) {
      g.lineStyle(4 - i, 0x9b7bff, 0.5 - i * 0.12);
      g.strokeCircle(64, 64, 58 - i * 8);
    }
    g.fillStyle(0x4c1d95, 0.15);
    g.fillCircle(64, 64, 50);
    g.generateTexture("domain_ring", 128, 128);

    // ── Projectile sprites ──────────────────────────────────────────────
    // Hammer (Nobara: Straw Doll) — head + shaft
    g.clear();
    g.fillStyle(0x111827, 1);
    g.fillRect(2, 13, 30, 6);
    g.lineStyle(2, 0xf472b6, 1);
    g.strokeRect(2, 13, 30, 6);
    g.fillStyle(0x4b5563, 1);
    g.fillRect(26, 6, 14, 20);
    g.lineStyle(2, 0xfb7185, 1);
    g.strokeRect(26, 6, 14, 20);
    g.generateTexture("proj_hammer", 42, 32);

    // Nail (Nobara secondary)
    g.clear();
    g.fillStyle(0xfde68a, 1);
    g.fillTriangle(0, 4, 22, 0, 22, 8);
    g.fillStyle(0x9ca3af, 1);
    g.fillRect(22, 1, 16, 6);
    g.generateTexture("proj_nail", 40, 8);

    // Divine Dog orb (Megumi)
    g.clear();
    g.fillStyle(0x1e3a8a, 1);
    g.fillCircle(14, 14, 13);
    g.fillStyle(0x60a5fa, 0.9);
    g.fillCircle(14, 14, 9);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(10, 11, 2);
    g.fillCircle(18, 11, 2);
    g.fillStyle(0x1e3a8a, 1);
    g.fillTriangle(8, 6, 12, 2, 12, 8);
    g.fillTriangle(20, 6, 16, 2, 16, 8);
    g.generateTexture("proj_dog", 28, 28);

    // Nue dive bomb (Megumi)
    g.clear();
    g.fillStyle(0x4338ca, 1);
    g.fillTriangle(16, 0, 0, 24, 32, 24);
    g.fillStyle(0x818cf8, 1);
    g.fillTriangle(16, 6, 6, 22, 26, 22);
    g.fillStyle(0xfde68a, 1);
    g.fillCircle(16, 20, 3);
    g.generateTexture("proj_nue", 32, 28);

    // Yuji fist crack
    g.clear();
    g.fillStyle(0xff6b4a, 0.85);
    g.fillCircle(18, 18, 16);
    g.fillStyle(0xfff7ed, 1);
    g.fillCircle(18, 18, 10);
    g.fillStyle(0xff6b4a, 1);
    g.fillTriangle(18, 4, 12, 18, 24, 18);
    g.fillTriangle(18, 32, 12, 18, 24, 18);
    g.generateTexture("proj_fist", 36, 36);

    // Gojo Blue vortex curl
    g.clear();
    g.lineStyle(3, 0x60a5fa, 1);
    g.beginPath();
    g.arc(16, 16, 12, 0, Math.PI * 1.4, false);
    g.strokePath();
    g.fillStyle(0x1e3a8a, 0.65);
    g.fillCircle(16, 16, 6);
    g.generateTexture("proj_blue", 32, 32);

    // Gojo Red push wave
    g.clear();
    g.fillStyle(0xef4444, 0.85);
    g.fillTriangle(2, 16, 30, 4, 30, 28);
    g.fillStyle(0xfecaca, 1);
    g.fillTriangle(8, 16, 26, 8, 26, 24);
    g.generateTexture("proj_red", 32, 32);

    // Gojo Hollow Purple beam segment
    g.clear();
    const grad = g;
    grad.fillStyle(0x4c1d95, 1);
    grad.fillRect(0, 6, 64, 4);
    grad.fillStyle(0xa855f7, 1);
    grad.fillRect(0, 7, 64, 2);
    grad.fillStyle(0xffffff, 1);
    grad.fillRect(0, 7, 64, 1);
    g.generateTexture("proj_beam", 64, 16);

    // ── Maki Zenin (dark green / steel) ────────────────────────────────
    // Cursed spear — long shaft, sharp head, faint emerald glow trail.
    g.clear();
    g.fillStyle(0x0f3d22, 1);
    g.fillRect(0, 9, 48, 6); // outer shadow
    g.fillStyle(0x4b5563, 1);
    g.fillRect(2, 10, 40, 4); // steel shaft
    g.fillStyle(0x064e3b, 1);
    g.fillTriangle(36, 4, 60, 12, 36, 20); // head shadow
    g.fillStyle(0x10b981, 1);
    g.fillTriangle(38, 6, 56, 12, 38, 18); // emerald edge
    g.fillStyle(0xa7f3d0, 1);
    g.fillRect(0, 11, 18, 2); // bright energy trail
    g.generateTexture("proj_spear", 60, 24);

    // Chain kunai — small triangular blade with a tether segment trailing.
    g.clear();
    g.fillStyle(0x1f2937, 1);
    g.fillTriangle(8, 2, 24, 10, 8, 18);
    g.fillStyle(0x9ca3af, 1);
    g.fillTriangle(10, 4, 22, 10, 10, 16);
    g.fillStyle(0x10b981, 1);
    g.fillRect(0, 9, 8, 2); // emerald chain glow
    g.lineStyle(1, 0x6ee7b7, 1);
    g.strokeRect(10, 8, 12, 4);
    g.generateTexture("proj_kunai", 26, 20);

    // Slash wave — thin crescent of emerald cursed energy.
    g.clear();
    g.lineStyle(4, 0x064e3b, 0.8);
    g.beginPath();
    g.arc(28, 28, 22, -1.0, 1.0, false);
    g.strokePath();
    g.lineStyle(3, 0x10b981, 1);
    g.beginPath();
    g.arc(28, 28, 22, -1.0, 1.0, false);
    g.strokePath();
    g.lineStyle(1.5, 0xd1fae5, 1);
    g.beginPath();
    g.arc(28, 28, 22, -0.7, 0.7, false);
    g.strokePath();
    g.generateTexture("proj_slash_wave", 56, 56);

    // Dragon-Bone cleaver arc — fat crescent, black/silver with crit hint.
    g.clear();
    g.lineStyle(6, 0x111827, 1);
    g.beginPath();
    g.arc(36, 36, 30, -1.2, 1.2, false);
    g.strokePath();
    g.lineStyle(4, 0x4b5563, 1);
    g.beginPath();
    g.arc(36, 36, 30, -1.1, 1.1, false);
    g.strokePath();
    g.lineStyle(2, 0xa7f3d0, 1);
    g.beginPath();
    g.arc(36, 36, 30, -0.9, 0.9, false);
    g.strokePath();
    g.generateTexture("proj_cleaver_arc", 72, 72);

    // ── Toge Inumaki (violet / white) ──────────────────────────────────
    // Cursed Speech ring — concentric purple/white rings with kana flicker.
    g.clear();
    g.lineStyle(4, 0x4c1d95, 0.95);
    g.strokeCircle(36, 36, 30);
    g.lineStyle(3, 0xa855f7, 1);
    g.strokeCircle(36, 36, 22);
    g.lineStyle(2, 0xede9fe, 1);
    g.strokeCircle(36, 36, 14);
    // pseudo-kana flecks
    g.fillStyle(0xffffff, 1);
    g.fillRect(34, 6, 4, 4);
    g.fillRect(58, 34, 4, 4);
    g.fillRect(10, 34, 4, 4);
    g.fillRect(34, 58, 4, 4);
    g.generateTexture("proj_speech_ring", 72, 72);

    // Don't Move sigil — floating kanji-ish glyph on a violet disc.
    g.clear();
    g.fillStyle(0x1e1b4b, 0.9);
    g.fillCircle(24, 24, 20);
    g.fillStyle(0xa855f7, 1);
    g.fillCircle(24, 24, 16);
    g.fillStyle(0xffffff, 1);
    g.fillRect(10, 18, 28, 3); // glyph top stroke
    g.fillRect(22, 8, 4, 24); // glyph vertical
    g.fillRect(14, 28, 20, 3); // glyph bottom
    g.fillRect(8, 14, 4, 4);
    g.fillRect(36, 30, 4, 4);
    g.generateTexture("proj_sigil", 48, 48);

    // Forbidden Vocabulary kanji command — big white glyph on violet halo.
    g.clear();
    g.fillStyle(0x4c1d95, 0.7);
    g.fillCircle(48, 48, 44);
    g.fillStyle(0xa855f7, 0.85);
    g.fillCircle(48, 48, 34);
    g.fillStyle(0xffffff, 1);
    // Cross-shape glyph (reads as a command)
    g.fillRect(20, 30, 56, 6);
    g.fillRect(20, 60, 56, 6);
    g.fillRect(28, 18, 6, 60);
    g.fillRect(62, 18, 6, 60);
    g.generateTexture("proj_forbidden_word", 96, 96);

    // ── Yuta Okkotsu (cyan / black) ────────────────────────────────────
    // Katana wave — thin compressed cyan/black crescent.
    g.clear();
    g.lineStyle(5, 0x0c0a09, 0.95);
    g.beginPath();
    g.arc(28, 28, 22, -1.2, 1.2, false);
    g.strokePath();
    g.lineStyle(3, 0x06b6d4, 1);
    g.beginPath();
    g.arc(28, 28, 22, -1.1, 1.1, false);
    g.strokePath();
    g.lineStyle(1.5, 0xcffafe, 1);
    g.beginPath();
    g.arc(28, 28, 22, -0.9, 0.9, false);
    g.strokePath();
    g.generateTexture("proj_katana_arc", 56, 56);

    // Rika manifestation fist — huge cursed fist with cyan outline.
    g.clear();
    g.fillStyle(0x000000, 1);
    g.fillCircle(32, 32, 28);
    g.fillStyle(0x111827, 1);
    g.fillCircle(32, 32, 24);
    g.fillStyle(0x06b6d4, 1);
    g.fillRect(18, 24, 30, 8); // knuckle slab
    g.fillRect(18, 36, 30, 8);
    g.fillStyle(0xa5f3fc, 1);
    g.fillRect(18, 26, 30, 2);
    g.fillRect(18, 38, 30, 2);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(46, 24, 3); // glint
    g.generateTexture("proj_rika_fist", 64, 64);

    // Mini Rika bite — small cyan teardrop with white eye.
    g.clear();
    g.fillStyle(0x000000, 1);
    g.fillCircle(14, 14, 12);
    g.fillStyle(0x06b6d4, 1);
    g.fillCircle(14, 14, 9);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(11, 12, 2);
    g.fillCircle(17, 12, 2);
    g.fillStyle(0x000000, 1);
    g.fillRect(10, 18, 8, 2); // teeth bar
    g.generateTexture("proj_mini_rika", 28, 28);

    // Love beam segment — wide cyan beam with white core.
    g.clear();
    g.fillStyle(0x0e7490, 1);
    g.fillRect(0, 4, 96, 16);
    g.fillStyle(0x06b6d4, 1);
    g.fillRect(0, 7, 96, 10);
    g.fillStyle(0xa5f3fc, 1);
    g.fillRect(0, 10, 96, 4);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 11, 96, 2);
    g.generateTexture("proj_love_beam", 96, 24);

    // ── Nobara Kugisaki (rusted red + black) ───────────────────────────
    // Embed nail — rust-iron nail wrapped in cursed energy, sharper than
    // the generic gold nail.
    g.clear();
    g.fillStyle(0xb91c1c, 1);
    g.fillTriangle(0, 4, 22, 0, 22, 8); // red tip
    g.fillStyle(0x1f2937, 1);
    g.fillRect(22, 1, 16, 6); // dark shaft
    g.fillStyle(0xfca5a5, 1);
    g.fillRect(34, 1, 6, 6); // bright head
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 3, 6, 2); // cursed energy glow
    g.generateTexture("proj_embed_nail", 40, 8);

    // Floating straw doll — small doll body with red cross marks.
    g.clear();
    g.fillStyle(0x451a03, 1);
    g.fillCircle(16, 16, 14);
    g.fillStyle(0xa16207, 1);
    g.fillCircle(16, 16, 11);
    g.fillStyle(0xfca5a5, 1);
    g.fillRect(11, 11, 4, 4); // left eye
    g.fillRect(17, 11, 4, 4); // right eye
    g.fillStyle(0xb91c1c, 1);
    g.fillRect(10, 22, 12, 2); // mouth stitch
    g.fillRect(8, 16, 16, 1); // horizontal cross stitch
    g.fillRect(16, 8, 1, 16); // vertical cross stitch
    g.generateTexture("proj_floating_doll", 32, 32);

    // Nail rupture — large black-red explosion blast.
    g.clear();
    g.fillStyle(0x000000, 1);
    g.fillCircle(48, 48, 44);
    g.fillStyle(0x7f1d1d, 1);
    g.fillCircle(48, 48, 34);
    g.fillStyle(0xb91c1c, 1);
    g.fillCircle(48, 48, 22);
    g.fillStyle(0xfca5a5, 1);
    g.fillCircle(48, 48, 12);
    // Crack lines radiating outward — black-red rupture motif.
    g.lineStyle(2, 0x000000, 1);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.beginPath();
      g.moveTo(48 + Math.cos(a) * 12, 48 + Math.sin(a) * 12);
      g.lineTo(48 + Math.cos(a) * 44, 48 + Math.sin(a) * 44);
      g.strokePath();
    }
    g.generateTexture("proj_nail_rupture", 96, 96);

    // ── Megumi Fushiguro (navy + black + blue eye-glow) ────────────────
    // Dash wolf — wolf head silhouette with glowing blue eyes.
    g.clear();
    g.fillStyle(0x0c0a09, 1);
    g.fillCircle(20, 20, 18);
    g.fillStyle(0x1e1b4b, 1);
    g.fillCircle(20, 20, 14);
    // Wolf ears (triangles)
    g.fillStyle(0x0c0a09, 1);
    g.fillTriangle(8, 10, 12, 0, 16, 12);
    g.fillTriangle(32, 10, 28, 0, 24, 12);
    // Glowing blue eyes
    g.fillStyle(0x60a5fa, 1);
    g.fillCircle(15, 18, 3);
    g.fillCircle(25, 18, 3);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(15, 18, 1.5);
    g.fillCircle(25, 18, 1.5);
    // Fang
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(18, 26, 20, 32, 22, 26);
    g.generateTexture("proj_dash_wolf", 40, 40);

    // Shadow frog — squat dark blob with two glowing eyes.
    g.clear();
    g.fillStyle(0x0c0a09, 1);
    g.fillCircle(18, 22, 16);
    g.fillStyle(0x1e3a8a, 1);
    g.fillCircle(18, 22, 12);
    // Eyes on top
    g.fillStyle(0x0c0a09, 1);
    g.fillCircle(12, 10, 5);
    g.fillCircle(24, 10, 5);
    g.fillStyle(0x60a5fa, 1);
    g.fillCircle(12, 10, 3);
    g.fillCircle(24, 10, 3);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(12, 10, 1.2);
    g.fillCircle(24, 10, 1.2);
    g.generateTexture("proj_shadow_frog", 36, 36);

    // Shadow pool — large dark navy circle with subtle inner ring.
    g.clear();
    g.fillStyle(0x000000, 0.85);
    g.fillCircle(56, 56, 54);
    g.fillStyle(0x1e1b4b, 0.9);
    g.fillCircle(56, 56, 46);
    g.lineStyle(2, 0x60a5fa, 0.6);
    g.strokeCircle(56, 56, 38);
    g.lineStyle(1, 0x60a5fa, 0.4);
    g.strokeCircle(56, 56, 28);
    g.strokeCircle(56, 56, 18);
    g.generateTexture("proj_shadow_pool", 112, 112);

    // Shadow beast — giant fused shadow form with blue eye-glow.
    g.clear();
    g.fillStyle(0x000000, 1);
    g.fillCircle(40, 40, 36);
    g.fillStyle(0x0c0a09, 1);
    g.fillCircle(40, 40, 30);
    g.fillStyle(0x1e1b4b, 1);
    g.fillCircle(40, 40, 22);
    // Multiple glowing eyes — the beast is many shadows fused.
    g.fillStyle(0x60a5fa, 1);
    g.fillCircle(28, 32, 3);
    g.fillCircle(38, 28, 3);
    g.fillCircle(48, 34, 3);
    g.fillCircle(32, 46, 3);
    g.fillCircle(46, 46, 3);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(28, 32, 1.2);
    g.fillCircle(38, 28, 1.2);
    g.fillCircle(48, 34, 1.2);
    g.fillCircle(32, 46, 1.2);
    g.fillCircle(46, 46, 1.2);
    // Fangs along bottom edge
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(28, 58, 32, 70, 36, 58);
    g.fillTriangle(36, 60, 40, 72, 44, 60);
    g.fillTriangle(44, 58, 48, 70, 52, 58);
    g.generateTexture("proj_shadow_beast", 80, 80);

    // ── Gojo Satoru (cyan + violet — Hollow Purple) ────────────────────
    // Hollow Purple orb — fused Blue + Red into a violet super-orb with
    // bright white core.
    g.clear();
    g.fillStyle(0x2e1065, 1);
    g.fillCircle(48, 48, 44);
    g.fillStyle(0x7c3aed, 1);
    g.fillCircle(48, 48, 36);
    g.fillStyle(0xc084fc, 1);
    g.fillCircle(48, 48, 24);
    g.fillStyle(0xede9fe, 1);
    g.fillCircle(48, 48, 14);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(48, 48, 7);
    // Hairline space-tear marks
    g.lineStyle(1, 0xffffff, 0.4);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.3;
      g.beginPath();
      g.moveTo(48 + Math.cos(a) * 8, 48 + Math.sin(a) * 8);
      g.lineTo(48 + Math.cos(a) * 40, 48 + Math.sin(a) * 40);
      g.strokePath();
    }
    g.generateTexture("proj_purple_orb", 96, 96);

    // Unlimited Void eye — massive cosmic eye over a darkened circle.
    g.clear();
    g.fillStyle(0x000000, 0.95);
    g.fillCircle(96, 96, 92);
    g.fillStyle(0x1e1b4b, 0.95);
    g.fillCircle(96, 96, 78);
    // Cyan eye whites
    g.fillStyle(0x67e8f9, 1);
    g.fillCircle(96, 96, 56);
    g.fillStyle(0xcffafe, 1);
    g.fillCircle(96, 96, 48);
    // Iris
    g.fillStyle(0x2e1065, 1);
    g.fillCircle(96, 96, 36);
    g.fillStyle(0x7c3aed, 1);
    g.fillCircle(96, 96, 28);
    // Pupil
    g.fillStyle(0x000000, 1);
    g.fillCircle(96, 96, 16);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(92, 92, 4); // glint
    g.generateTexture("proj_void_eye", 192, 192);

    // ── Yuji Itadori (red + black + white cracks) ──────────────────────
    // Divergent impact — delayed cursed-energy second hit. White-red glyph
    // burst with cross strokes.
    g.clear();
    g.fillStyle(0x7f1d1d, 0.85);
    g.fillCircle(28, 28, 26);
    g.fillStyle(0xb91c1c, 1);
    g.fillCircle(28, 28, 18);
    g.fillStyle(0xfecaca, 1);
    g.fillCircle(28, 28, 10);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(28, 28, 5);
    // Sparkle cross
    g.fillStyle(0xffffff, 1);
    g.fillRect(2, 27, 52, 2);
    g.fillRect(27, 2, 2, 52);
    g.generateTexture("proj_divergent_impact", 56, 56);

    // Manji Kick wave — red-black crescent kick wave.
    g.clear();
    g.lineStyle(5, 0x000000, 1);
    g.beginPath();
    g.arc(30, 30, 24, -1.2, 1.2, false);
    g.strokePath();
    g.lineStyle(3, 0xef4444, 1);
    g.beginPath();
    g.arc(30, 30, 24, -1.1, 1.1, false);
    g.strokePath();
    g.lineStyle(1.5, 0xffffff, 1);
    g.beginPath();
    g.arc(30, 30, 24, -0.7, 0.7, false);
    g.strokePath();
    g.generateTexture("proj_kick_wave", 60, 60);

    // Black Flash spatial crack — white spider-crack on a red-black halo.
    g.clear();
    g.fillStyle(0x000000, 0.85);
    g.fillCircle(36, 36, 34);
    g.fillStyle(0x7f1d1d, 0.85);
    g.fillCircle(36, 36, 26);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(36, 36, 4);
    // Crack lines branching out
    g.lineStyle(2, 0xffffff, 1);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      g.beginPath();
      g.moveTo(36, 36);
      g.lineTo(36 + Math.cos(a) * 32, 36 + Math.sin(a) * 32);
      g.strokePath();
      // Sub-branches
      const sa = a + 0.4;
      g.beginPath();
      g.moveTo(36 + Math.cos(a) * 14, 36 + Math.sin(a) * 14);
      g.lineTo(36 + Math.cos(sa) * 26, 36 + Math.sin(sa) * 26);
      g.strokePath();
    }
    g.generateTexture("proj_black_flash_crack", 72, 72);

    // ── Pickup variants ────────────────────────────────────────────────
    // Health heart — bright green so it pops over enemies.
    g.clear();
    g.fillStyle(0x0f3d22, 1);
    g.fillCircle(10, 12, 9);
    g.fillCircle(22, 12, 9);
    g.fillTriangle(2, 14, 30, 14, 16, 30);
    g.fillStyle(0x22c55e, 1);
    g.fillCircle(10, 11, 7);
    g.fillCircle(22, 11, 7);
    g.fillTriangle(4, 13, 28, 13, 16, 27);
    g.fillStyle(0xbbf7d0, 1);
    g.fillCircle(8, 9, 2);
    g.generateTexture("pickup_health", 32, 32);

    // Curse bomb — round black sphere with red fuse.
    g.clear();
    g.fillStyle(0x111827, 1);
    g.fillCircle(16, 18, 12);
    g.fillStyle(0x4b5563, 1);
    g.fillCircle(13, 15, 4);
    g.fillStyle(0xef4444, 1);
    g.fillRect(15, 2, 2, 6);
    g.fillStyle(0xfde047, 1);
    g.fillCircle(16, 2, 3);
    g.fillStyle(0xfb923c, 1);
    g.fillCircle(16, 2, 1.5);
    g.generateTexture("pickup_bomb", 32, 32);

    g.destroy();

    // Procedural shapes are designed at 1:1 px — nearest filtering keeps their
    // edges crisp, while the global LINEAR default still handles the
    // higher-res character + floor textures cleanly.
    const proceduralKeys = [
      "particle_hit",
      "particle_spark",
      "particle_curse",
      "particle_elite",
      "particle_boss",
      "player_glow",
      "domain_ring",
      "proj_hammer",
      "proj_nail",
      "proj_dog",
      "proj_nue",
      "proj_fist",
      "proj_blue",
      "proj_red",
      "proj_beam",
      // ── New character projectiles ──────────────────────────────
      "proj_spear",
      "proj_kunai",
      "proj_slash_wave",
      "proj_cleaver_arc",
      "proj_speech_ring",
      "proj_sigil",
      "proj_forbidden_word",
      "proj_katana_arc",
      "proj_rika_fist",
      "proj_mini_rika",
      "proj_love_beam",
      // Nobara
      "proj_embed_nail",
      "proj_floating_doll",
      "proj_nail_rupture",
      // Megumi
      "proj_dash_wolf",
      "proj_shadow_frog",
      "proj_shadow_pool",
      "proj_shadow_beast",
      // Gojo
      "proj_purple_orb",
      "proj_void_eye",
      // Yuji
      "proj_divergent_impact",
      "proj_kick_wave",
      "proj_black_flash_crack",
      "pickup_health",
      "pickup_bomb",
    ];
    for (const key of proceduralKeys) {
      if (this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
  }

  create() {
    cleanAllSpriteTextures(this);
    registerSpriteAnims(this);
    // Preload stage music tracks. Done here so by the time the user picks
    // a stage and presses Start, the AudioBuffer is already decoded and
    // playback begins instantly without a flash of the procedural pad.
    const trackUrls = STAGES.map((s) => s.music.trackUrl).filter(
      (u): u is string => !!u
    );
    audioManager.preloadStageTracks(trackUrls);
    // Ensure illustration textures (character art, arena floor) explicitly
    // use linear filtering even if a later Phaser default changes.
    for (const key of [
      "arena_floor",
      "floor_shibuya",
      "floor_subway",
      "floor_forest",
      "floor_goodwill",
    ]) {
      if (this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }
  }
}
