/** Procedural SFX + lightweight music layers via Web Audio — no asset files required */

export type MusicLayer = "calm" | "combat" | "boss";

/**
 * Snapshot of a stage's music theme — duplicates the StageDef.music shape
 * but lives here so the audio module doesn't take a hard dependency on
 * game-core's types (avoids server typecheck fallout).
 */
export interface MusicThemeSnapshot {
  chord: number[];
  cutoff: { calm: number; combat: number; boss: number };
  lfo: { calm: number; combat: number; boss: number };
  wave?: "sine" | "triangle";
  /**
   * Optional URL to a pre-rendered looping audio track for this stage. When
   * provided and successfully loaded, the procedural pad is replaced with
   * this track; the LP filter envelope (cutoff/lfo per layer) is still
   * applied so combat / boss escalation reads through.
   */
  trackUrl?: string;
}

const DEFAULT_THEME: MusicThemeSnapshot = {
  // C minor triad — used when no stage is selected (Daily, Practice, lobby).
  chord: [65.41, 77.78, 98.0],
  cutoff: { calm: 480, combat: 900, boss: 1400 },
  lfo: { calm: 0.07, combat: 0.11, boss: 0.18 },
  wave: "sine",
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private musicGain?: GainNode;
  private sfxGain?: GainNode;
  /**
   * Music base gain. The previous version multiplied the user slider by 0.12
   * and used a sawtooth drone which read as harsh; the new pad is gentler so
   * we can keep the headroom but cap it well below the SFX channel.
   */
  musicVolume = 0.04;
  sfxVolume = 0.2;
  /** Multi-oscillator chord pad (root + minor third + fifth) replaces the
   *  single sawtooth drone. Sine waves through a low-pass filter give a soft
   *  ambient pad that breathes with the LFO instead of buzzing in place. */
  private musicOscs: OscillatorNode[] = [];
  private musicFilter?: BiquadFilterNode;
  private musicLfo?: OscillatorNode;
  private muted = false;
  private duckTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentLayer: MusicLayer = "calm";
  private currentTheme: MusicThemeSnapshot = DEFAULT_THEME;
  /** Cache of decoded stage audio buffers, keyed by URL. */
  private trackBuffers = new Map<string, AudioBuffer>();
  /** In-flight loads so callers don't double-fetch the same URL. */
  private trackLoads = new Map<string, Promise<AudioBuffer | null>>();
  /** Currently playing pre-rendered track (mutually exclusive with musicOscs). */
  private trackSource?: AudioBufferSourceNode;
  private trackUrl: string | null = null;

  private ensureCtx() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.sfxGain.gain.value = this.sfxVolume;
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  resume() {
    const ctx = this.ensureCtx();
    if (ctx.state === "suspended") void ctx.resume();
  }

  /**
   * Fetch + decode a stage track. Cached so repeated calls with the same
   * URL resolve immediately. Returns null on failure (e.g. file missing)
   * which causes the AudioManager to fall back to the procedural pad.
   */
  loadStageTrack(url: string): Promise<AudioBuffer | null> {
    if (this.trackBuffers.has(url)) {
      return Promise.resolve(this.trackBuffers.get(url) ?? null);
    }
    const existing = this.trackLoads.get(url);
    if (existing) return existing;
    const ctx = this.ensureCtx();
    const p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((ab) => ctx.decodeAudioData(ab))
      .then((buf) => {
        this.trackBuffers.set(url, buf);
        return buf;
      })
      .catch((err) => {
        // Soft-fail — the procedural pad still plays.
        console.warn("[audio] failed to load stage track", url, err);
        return null;
      });
    this.trackLoads.set(url, p);
    return p;
  }

  /**
   * Preload every stage track in parallel. Called from BootScene so by the
   * time the player picks a stage, the audio is decoded and ready.
   */
  preloadStageTracks(urls: string[]) {
    for (const u of urls) void this.loadStageTrack(u);
  }

  /**
   * Start playing the decoded buffer for the current theme through the
   * shared filter + music gain. Returns false if no buffer is ready (caller
   * falls back to the procedural pad).
   */
  private startTrack(buf: AudioBuffer): boolean {
    const ctx = this.ensureCtx();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = this.currentTheme.cutoff[this.currentLayer];
    filter.Q.value = 0.6;
    filter.connect(this.musicGain!);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(filter);
    src.start();

    // LFO breathes the cutoff so the recorded loop still has movement
    // between layers — combat / boss simply open the filter further.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = this.currentTheme.lfo[this.currentLayer];
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = Math.max(80, this.currentTheme.cutoff[this.currentLayer] * 0.25);
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    this.trackSource = src;
    this.musicFilter = filter;
    this.musicLfo = lfo;
    return true;
  }

  private stopTrack() {
    try { this.trackSource?.stop(); } catch { /* noop */ }
    try { this.trackSource?.disconnect(); } catch { /* noop */ }
    this.trackSource = undefined;
    try { this.musicLfo?.stop(); } catch { /* noop */ }
    this.musicLfo = undefined;
    try { this.musicFilter?.disconnect(); } catch { /* noop */ }
    this.musicFilter = undefined;
  }

  /**
   * Soft cinematic pad. A root + minor third + perfect fifth at low octave
   * goes through a slowly-modulated low-pass so the timbre opens/closes
   * gently. Combat / boss layers shift the cutoff and add a higher voicing.
   */
  startMusic() {
    if (this.muted) return;
    // If a stage track is already playing, don't restart it.
    if (this.trackSource || this.musicOscs.length) return;
    const ctx = this.ensureCtx();
    const theme = this.currentTheme;

    // Prefer the pre-rendered loop when available — otherwise fall back to
    // the procedural pad (used when no track URL is set or it failed to load).
    if (theme.trackUrl) {
      const buf = this.trackBuffers.get(theme.trackUrl);
      if (buf) {
        this.trackUrl = theme.trackUrl;
        this.startTrack(buf);
        return;
      }
      // Kick off a load so the next stage change will hit the cache.
      void this.loadStageTrack(theme.trackUrl).then((b) => {
        if (b && !this.muted && !this.trackSource && !this.musicOscs.length) {
          this.trackUrl = theme.trackUrl ?? null;
          this.startTrack(b);
        }
      });
      // Fall through to the procedural pad as a transient placeholder.
    }

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = theme.cutoff.calm;
    filter.Q.value = 0.6;
    filter.connect(this.musicGain!);

    // Per-stage chord — fan the voices through a soft gain stage so even a
    // 4-voice voicing doesn't clip when the filter opens.
    const voiceGain = 1 / Math.max(1, theme.chord.length * 0.9);
    for (const f of theme.chord) {
      const osc = ctx.createOscillator();
      osc.type = theme.wave ?? "sine";
      osc.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = voiceGain;
      osc.connect(og).connect(filter);
      osc.start();
      this.musicOscs.push(osc);
    }
    // Slow LFO breathes the filter cutoff — gives motion without dissonance.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = theme.lfo.calm;
    const lfoGain = ctx.createGain();
    // LFO depth scales with the cutoff so the breathing motion is always
    // proportional to the timbre being modulated.
    lfoGain.gain.value = Math.max(80, theme.cutoff.calm * 0.35);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    this.musicFilter = filter;
    this.musicLfo = lfo;
    this.applyMusicLayer(this.currentLayer);
  }

  /**
   * Apply a stage music theme. Three cases:
   *   1. Music is off       → just remember the theme for next startMusic.
   *   2. Track URL changed  → stop everything, start the new track.
   *   3. Otherwise          → keep playing, retarget filter cutoff/LFO.
   */
  setMusicTheme(theme: MusicThemeSnapshot) {
    const prev = this.currentTheme;
    this.currentTheme = theme;

    const playing = !!this.trackSource || this.musicOscs.length > 0;
    if (!playing) return;

    if (theme.trackUrl !== prev.trackUrl || theme.trackUrl !== this.trackUrl) {
      // Swap track or transition between track ↔ procedural pad.
      this.stopMusic();
      this.startMusic();
      return;
    }
    // Same source — keep playing and retarget filter envelope.
    this.applyMusicLayer(this.currentLayer);
  }

  stopMusic() {
    for (const osc of this.musicOscs) {
      try { osc.stop(); } catch { /* noop */ }
    }
    this.musicOscs = [];
    // stopTrack also tears down filter + LFO, so only do that path when a
    // track is actually playing; otherwise dispose the pad's filter chain.
    if (this.trackSource) {
      this.stopTrack();
      this.trackUrl = null;
    } else {
      try { this.musicLfo?.stop(); } catch { /* noop */ }
      this.musicLfo = undefined;
      try { this.musicFilter?.disconnect(); } catch { /* noop */ }
      this.musicFilter = undefined;
    }
  }

  applyVolumes(music: number, sfx: number) {
    // Music base gain is intentionally much lower than the slider would
    // suggest — the new pad is full-frequency-range and even at 0.06 it
    // sits comfortably under the SFX channel.
    this.musicVolume = music * 0.06;
    this.sfxVolume = sfx * 0.25;
    if (this.musicGain) this.musicGain.gain.value = this.muted ? 0 : this.musicVolume;
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
  }

  setMusicMuted(mute: boolean) {
    this.muted = mute;
    if (this.musicGain) this.musicGain.gain.value = mute ? 0 : this.musicVolume;
    if (mute) this.stopMusic();
    else this.startMusic();
  }

  /** Read-only mute state — used to render the on-screen mute indicator. */
  isMuted(): boolean {
    return this.muted;
  }

  /** Toggle mute, returns the new state (true = muted). */
  toggleMuted(): boolean {
    this.setMusicMuted(!this.muted);
    return this.muted;
  }

  /** Crossfade pitch / LFO to convey calm vs combat vs boss energy */
  setMusicLayer(layer: MusicLayer) {
    if (this.currentLayer === layer) return;
    this.currentLayer = layer;
    this.applyMusicLayer(layer);
  }

  private applyMusicLayer(layer: MusicLayer) {
    if (!this.musicFilter || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Use the per-stage envelope from the active theme. Calm = darkest,
    // boss = brightest — this is what makes each stage sound distinct
    // across all three layers.
    const targetCutoff = this.currentTheme.cutoff[layer];
    const targetLfo = this.currentTheme.lfo[layer];
    this.musicFilter.frequency.cancelScheduledValues(now);
    this.musicFilter.frequency.linearRampToValueAtTime(targetCutoff, now + 1.8);
    if (this.musicLfo) {
      this.musicLfo.frequency.cancelScheduledValues(now);
      this.musicLfo.frequency.linearRampToValueAtTime(targetLfo, now + 1.8);
    }
  }

  /** Briefly drop music gain (used during draft / boss intro / domain) */
  duckMusic(factor = 0.3, durationMs = 800) {
    if (!this.musicGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    const baseline = this.muted ? 0 : this.musicVolume;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.linearRampToValueAtTime(baseline * factor, now + 0.08);
    if (this.duckTimeout) clearTimeout(this.duckTimeout);
    this.duckTimeout = setTimeout(() => {
      if (!this.musicGain || !this.ctx) return;
      const t = this.ctx.currentTime;
      this.musicGain.gain.linearRampToValueAtTime(baseline, t + 0.4);
      this.duckTimeout = null;
    }, durationMs);
  }

  playHit() {
    this.beep(180, 0.05, "square");
  }

  /** Pan a hit toward where it happened relative to camera */
  playSpatialHit(worldX: number, worldY: number, camX: number, camY: number) {
    this.ensureCtx();
    const dx = worldX - camX;
    const dist = Math.hypot(dx, worldY - camY);
    if (dist > 900) return;
    const pan = Math.max(-1, Math.min(1, dx / 600));
    const vol = Math.max(0.15, 1 - dist / 900);
    this.beepPanned(180 + Math.random() * 40, 0.045, "square", pan, vol);
  }

  playLevelUp() {
    this.beep(523, 0.07, "sine");
    setTimeout(() => this.beep(659, 0.08, "sine"), 70);
    setTimeout(() => this.beep(784, 0.12, "sine"), 150);
    this.duckMusic(0.5, 600);
  }

  playDomain() {
    this.beep(60, 0.5, "sawtooth");
    setTimeout(() => this.beep(110, 0.4, "sawtooth"), 120);
    this.duckMusic(0.2, 1500);
  }

  playBossStinger() {
    this.beep(82, 0.4, "sawtooth");
    setTimeout(() => this.beep(98, 0.5, "square"), 180);
    this.duckMusic(0.15, 1400);
  }

  playUiClick() {
    this.beep(520, 0.03, "triangle");
  }

  playAchievement() {
    this.beep(880, 0.06, "triangle");
    setTimeout(() => this.beep(1175, 0.08, "triangle"), 80);
    setTimeout(() => this.beep(1568, 0.12, "triangle"), 180);
  }

  playPing() {
    this.beep(700, 0.04, "sine");
    setTimeout(() => this.beep(900, 0.05, "sine"), 50);
  }

  /**
   * Soft "thump-thump" heartbeat played on a loop while HP is low. The host
   * scene calls `setLowHp(true|false)` rather than triggering this manually so
   * the cadence stays stable and stops cleanly on death / heal.
   */
  private heartbeatTimer?: number;
  /**
   * Combo-aware hit beep (Tier 2 #7): pitch climbs the longer your hit chain
   * runs. Reset by `setHitCombo(0)` when the engine notices a streak break.
   * Capped at +12 semitones above base to stop the pitch from running away.
   */
  private comboHits = 0;
  private comboLastT = 0;
  setHitCombo(n: number) {
    this.comboHits = n;
  }
  playHitBeep() {
    const now = performance.now();
    // Auto-decay combo if no hits in ~1s — keeps the pitch chain reactive to
    // burst combat without needing engine plumbing on a timeout.
    if (now - this.comboLastT > 1000) this.comboHits = 0;
    this.comboLastT = now;
    this.comboHits = Math.min(this.comboHits + 1, 32);
    const semitones = Math.min(12, this.comboHits * 0.55);
    const base = 460;
    const freq = base * Math.pow(2, semitones / 12);
    this.beep(freq, 0.02, "triangle");
  }

  setLowHp(active: boolean) {
    if (active) {
      if (this.heartbeatTimer !== undefined) return;
      const tick = () => {
        this.beep(95, 0.09, "sine");
        setTimeout(() => this.beep(72, 0.12, "sine"), 140);
      };
      tick();
      this.heartbeatTimer = window.setInterval(tick, 900);
    } else if (this.heartbeatTimer !== undefined) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * Voice-line hook: per-character vocalization stinger. Procedural arpeggio
   * (uses pitched square/triangle blend) keyed to character "voice" — placeholder
   * for real recorded clips. Different intent => different motif.
   */
  playCharacterShout(
    characterId: string,
    intent: "domain" | "down" | "levelup" | "boss"
  ) {
    const voice = CHARACTER_VOICE[characterId] ?? CHARACTER_VOICE.yuji;
    const motif = INTENT_MOTIF[intent];
    motif.forEach(([interval, dur], i) => {
      const freq = voice.base * Math.pow(2, interval / 12);
      setTimeout(() => this.beep(freq, dur, voice.osc), i * 90);
    });
  }

  private beep(freq: number, dur: number, type: OscillatorType) {
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = 0.15;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(this.sfxGain!);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  private beepPanned(

    freq: number,
    dur: number,
    type: OscillatorType,
    pan: number,
    volume: number
  ) {
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = 0.12 * volume;
    g.gain.exponentialRampToValueAtTime(0.0005, ctx.currentTime + dur);
    osc.connect(g);
    if (typeof StereoPannerNode !== "undefined") {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      g.connect(panner);
      panner.connect(this.sfxGain!);
    } else {
      g.connect(this.sfxGain!);
    }
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }
}

export const audioManager = new AudioManager();

/** Per-character procedural voice "timbre" — different osc + pitch register */
const CHARACTER_VOICE: Record<string, { base: number; osc: OscillatorType }> = {
  yuji: { base: 200, osc: "square" },
  megumi: { base: 165, osc: "sawtooth" },
  nobara: { base: 260, osc: "triangle" },
  gojo: { base: 230, osc: "sine" },
};

/** Motifs as [semitone offset, duration] pairs */
const INTENT_MOTIF: Record<"domain" | "down" | "levelup" | "boss", [number, number][]> = {
  // Resolute downward — "Domain Expansion"
  domain: [
    [0, 0.12],
    [-5, 0.14],
    [-12, 0.22],
  ],
  // Sharp fall — pain
  down: [
    [4, 0.08],
    [-3, 0.12],
  ],
  // Bright rise — accomplishment
  levelup: [
    [0, 0.06],
    [7, 0.07],
    [12, 0.12],
  ],
  // Confrontational — "tch!"
  boss: [
    [12, 0.05],
    [10, 0.08],
  ],
};
