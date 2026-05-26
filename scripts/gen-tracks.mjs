// Procedural stage music generator.
//
// Synthesizes one looping WAV per stage and writes it to
// `apps/client/public/audio/stage_<id>.wav`. Re-run after editing any
// pattern below:
//   node scripts/gen-tracks.mjs
//
// Output is mono 22050 Hz 16-bit PCM, sized so each loop is an integer
// number of bars at the stage's tempo — they wrap seamlessly.

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), "..");
const OUT_DIR = join(ROOT, "apps/client/public/audio");
const SR = 22050;

/** Convert MIDI note number to frequency (Hz). A4 = 69 → 440 Hz. */
const note = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** Generic ADSR envelope. Returns 0..1 amplitude at time `t` (sec). */
function adsr(t, dur, a, d, s, r) {
  if (t < 0 || t > dur) return 0;
  if (t < a) return t / a;
  if (t < a + d) return 1 - ((t - a) / d) * (1 - s);
  if (t < dur - r) return s;
  return s * (1 - (t - (dur - r)) / r);
}

/** Single-pole low-pass for static post-render warmth. */
function lowpass(samples, cutoff) {
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / SR;
  const alpha = dt / (rc + dt);
  let prev = 0;
  for (let i = 0; i < samples.length; i++) {
    prev = prev + alpha * (samples[i] - prev);
    samples[i] = prev;
  }
}

/** Soft saturation — keeps the mix bus from clipping when voices stack. */
function softClip(x) {
  return Math.tanh(x * 0.85);
}

/** Write a Float32 sample buffer as 16-bit PCM mono WAV. */
function writeWav(path, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s * 0x7fff) | 0, 44 + i * 2);
  }
  writeFileSync(path, buf);
}

// ── Voice helpers ──────────────────────────────────────────────────────

/** Mix a sustained sine into `out` from `tStart` for `dur` seconds. */
function pad(out, freq, tStart, dur, gain = 0.18) {
  const start = Math.floor(tStart * SR);
  const end = Math.floor((tStart + dur) * SR);
  for (let i = start; i < end && i < out.length; i++) {
    const t = (i - start) / SR;
    const env = adsr(t, dur, 0.4, 0.6, 0.9, 0.6);
    out[i] += Math.sin(2 * Math.PI * freq * t) * gain * env;
  }
}

/** Pluck — fast attack/decay tone, mostly sine + a touch of triangle. */
function pluck(out, freq, tStart, dur, gain = 0.22) {
  const start = Math.floor(tStart * SR);
  const end = Math.floor((tStart + dur) * SR);
  for (let i = start; i < end && i < out.length; i++) {
    const t = (i - start) / SR;
    const env = adsr(t, dur, 0.005, 0.08, 0.4, 0.18);
    // Sine for body, triangle for slight pluck character.
    const sine = Math.sin(2 * Math.PI * freq * t);
    const phase = (freq * t) % 1;
    const tri = Math.abs(phase - 0.5) * 4 - 1;
    out[i] += (sine * 0.7 + tri * 0.3) * gain * env;
  }
}

/** Bass — saw wave through a quick filter for a punchy low end. */
function bass(out, freq, tStart, dur, gain = 0.18) {
  const start = Math.floor(tStart * SR);
  const end = Math.floor((tStart + dur) * SR);
  // Simple one-pole low-pass per-sample so the bass keeps its shape.
  const alpha = 0.18;
  let prev = 0;
  for (let i = start; i < end && i < out.length; i++) {
    const t = (i - start) / SR;
    const env = adsr(t, dur, 0.005, 0.25, 0.65, 0.18);
    const phase = (freq * t) % 1;
    const saw = phase * 2 - 1;
    prev = prev + alpha * (saw - prev);
    out[i] += prev * gain * env;
  }
}

/** Soft kick drum — 60→30 Hz sine sweep with quick decay. */
function kick(out, tStart, gain = 0.45) {
  const dur = 0.18;
  const start = Math.floor(tStart * SR);
  const end = Math.floor((tStart + dur) * SR);
  for (let i = start; i < end && i < out.length; i++) {
    const t = (i - start) / SR;
    const f = 60 - 30 * (t / dur);
    const env = Math.exp(-t * 14);
    out[i] += Math.sin(2 * Math.PI * f * t) * gain * env;
  }
}

/** Closed hi-hat — short noise burst high-pass-ish. */
function hat(out, tStart, gain = 0.06) {
  const dur = 0.04;
  const start = Math.floor(tStart * SR);
  const end = Math.floor((tStart + dur) * SR);
  let prev = 0;
  for (let i = start; i < end && i < out.length; i++) {
    const t = (i - start) / SR;
    const env = Math.exp(-t * 80);
    const n = (Math.random() * 2 - 1);
    // Crude high-pass: emphasise the diff between successive samples.
    const hp = n - prev;
    prev = n;
    out[i] += hp * gain * env;
  }
}

/** Pizzicato pluck — bell-like with a tiny noise transient. */
function bell(out, freq, tStart, dur, gain = 0.16) {
  const start = Math.floor(tStart * SR);
  const end = Math.floor((tStart + dur) * SR);
  for (let i = start; i < end && i < out.length; i++) {
    const t = (i - start) / SR;
    const env = Math.exp(-t * 4);
    const tone = Math.sin(2 * Math.PI * freq * t)
              + Math.sin(2 * Math.PI * freq * 2 * t) * 0.4
              + Math.sin(2 * Math.PI * freq * 3 * t) * 0.18;
    out[i] += tone * gain * env * 0.55;
  }
}

/** Handclap — three quick noise bursts. */
function clap(out, tStart, gain = 0.1) {
  for (const off of [0, 0.012, 0.026]) {
    const start = Math.floor((tStart + off) * SR);
    const end = start + Math.floor(0.05 * SR);
    for (let i = start; i < end && i < out.length; i++) {
      const t = (i - start) / SR;
      const env = Math.exp(-t * 38);
      out[i] += (Math.random() * 2 - 1) * gain * env;
    }
  }
}

// ── Stage track patterns ───────────────────────────────────────────────

/**
 * Build a track from a tempo + bar count + per-voice scheduler. Each
 * scheduler is a function(out, beat) that adds samples for one beat.
 */
function renderStage({ bpm, bars, build }) {
  const beats = bars * 4;
  const beatSec = 60 / bpm;
  const totalSec = beats * beatSec;
  const totalSamples = Math.floor(totalSec * SR);
  const out = new Float32Array(totalSamples);
  for (let beat = 0; beat < beats; beat++) {
    build(out, beat, beatSec);
  }
  // Subtle global LPF to round off edges, then soft clip for safety.
  lowpass(out, 8000);
  for (let i = 0; i < out.length; i++) out[i] = softClip(out[i]);
  // 50ms equal-power crossfade at the loop seam so even non-aligned voices
  // wrap cleanly. Small enough that it's inaudible musically.
  const fade = Math.floor(0.05 * SR);
  for (let i = 0; i < fade; i++) {
    const a = i / fade; // 0→1 as we approach end
    const idxEnd = out.length - fade + i;
    const idxStart = i;
    const mixed = out[idxEnd] * (1 - a * 0.5) + out[idxStart] * (a * 0.5);
    out[idxEnd] = mixed;
  }
  return out;
}

// Shibuya — cyberpunk urban, 110 BPM, E minor, driving arp.
const shibuya = () =>
  renderStage({
    bpm: 110,
    bars: 8,
    build(out, beat, beatSec) {
      const t = beat * beatSec;
      const bar = Math.floor(beat / 4);
      // Bass: E2 on every beat, drops to D2 on bar 6 for a small turn.
      const bassNote = bar === 5 ? 38 : 40; // D2 vs E2
      bass(out, note(bassNote), t, beatSec * 0.9, 0.16);
      // Pad: sustained E B chord, rebuilds every 2 bars.
      if (beat % 8 === 0) {
        pad(out, note(40), t, beatSec * 8, 0.08);
        pad(out, note(47), t, beatSec * 8, 0.07);
        pad(out, note(52), t, beatSec * 8, 0.06);
      }
      // Arpeggio: 16ths cycling E G B D up and down.
      const arpNotes = [52, 55, 59, 62, 59, 55, 52, 55];
      for (let s = 0; s < 4; s++) {
        const n = arpNotes[(beat * 4 + s) % arpNotes.length];
        pluck(out, note(n), t + s * (beatSec / 4), beatSec * 0.18, 0.10);
      }
      // 4-on-the-floor kick, hat on the &.
      kick(out, t, 0.32);
      hat(out, t + beatSec / 2, 0.05);
    },
  });

// Subway — dark drone, 90 BPM, A minor (low), claustrophobic.
const subway = () =>
  renderStage({
    bpm: 90,
    bars: 8,
    build(out, beat, beatSec) {
      const t = beat * beatSec;
      // Sub bass: A1 pedal every 2 beats with long sustain.
      if (beat % 2 === 0) bass(out, note(33), t, beatSec * 1.9, 0.18);
      // Pad: dark A C E (low) sustained, rebuilds every 4 bars.
      if (beat % 16 === 0) {
        pad(out, note(33), t, beatSec * 16, 0.08);
        pad(out, note(36), t, beatSec * 16, 0.06);
        pad(out, note(40), t, beatSec * 16, 0.05);
      }
      // Sparse bell pluck on bar starts.
      if (beat % 8 === 0) bell(out, note(57), t + beatSec * 0.25, 1.2, 0.09);
      if (beat % 8 === 4) bell(out, note(60), t + beatSec * 0.25, 1.0, 0.07);
      // No drums — keep claustrophobic. Faint kick every 4 beats only.
      if (beat % 4 === 0) kick(out, t, 0.22);
    },
  });

// Forest — ambient mystical, 80 BPM, D major open, airy.
const forest = () =>
  renderStage({
    bpm: 80,
    bars: 8,
    build(out, beat, beatSec) {
      const t = beat * beatSec;
      // Open pad: D F# A D — re-strike every 4 bars.
      if (beat % 16 === 0) {
        pad(out, note(38), t, beatSec * 16, 0.07);
        pad(out, note(42), t, beatSec * 16, 0.06);
        pad(out, note(45), t, beatSec * 16, 0.06);
        pad(out, note(50), t, beatSec * 16, 0.05);
      }
      // 8th-note pluck arpeggio: F# A D F# A D (descending pattern bar 5+)
      const upPat = [54, 57, 62, 66];
      const downPat = [66, 62, 57, 54];
      const pat = beat >= 16 ? downPat : upPat;
      for (let s = 0; s < 2; s++) {
        const n = pat[(beat * 2 + s) % pat.length];
        pluck(out, note(n), t + s * (beatSec / 2), beatSec * 0.4, 0.08);
      }
      // High bell on bar 1, 5 for a hopeful accent.
      if (beat === 0 || beat === 16) bell(out, note(74), t, 1.8, 0.07);
    },
  });

// Goodwill — warm festival, 120 BPM, F major, marimba feel.
const goodwill = () =>
  renderStage({
    bpm: 120,
    bars: 8,
    build(out, beat, beatSec) {
      const t = beat * beatSec;
      // Bass on beats 1 and 3 (F2 / C3 alternating roots).
      if (beat % 2 === 0) {
        const root = beat % 4 === 0 ? 41 : 48; // F2 / C3
        bass(out, note(root), t, beatSec * 0.9, 0.14);
      }
      // Pad: F A C — sustained throughout (mellow background bed).
      if (beat % 16 === 0) {
        pad(out, note(53), t, beatSec * 16, 0.07);
        pad(out, note(57), t, beatSec * 16, 0.06);
        pad(out, note(60), t, beatSec * 16, 0.05);
      }
      // Marimba: 8th-note F-A-C-F pattern.
      const mar = [65, 69, 72, 77];
      for (let s = 0; s < 2; s++) {
        const n = mar[(beat * 2 + s) % mar.length];
        pluck(out, note(n), t + s * (beatSec / 2), beatSec * 0.3, 0.10);
      }
      // Clap on 2 and 4.
      if (beat % 2 === 1) clap(out, t, 0.07);
      // Hats on offbeats.
      hat(out, t + beatSec / 2, 0.05);
    },
  });

const TRACKS = {
  shibuya: shibuya,
  subway: subway,
  forest: forest,
  goodwill: goodwill,
};

for (const [id, fn] of Object.entries(TRACKS)) {
  const samples = fn();
  const path = join(OUT_DIR, `stage_${id}.wav`);
  writeWav(path, samples);
  console.log(
    "wrote",
    path,
    `(${samples.length} samples, ${(samples.length / SR).toFixed(2)} sec, ${(
      (samples.length * 2) / 1024
    ).toFixed(0)} KB)`
  );
}
