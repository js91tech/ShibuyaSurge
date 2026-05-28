import { RUN_DURATION_SEC, TECHNIQUES, levelFromXp } from "@jjk/game-core";
import type { SoloSnapshot } from "../game/solo/SoloEngine";
import { Minimap } from "../game/visual/Minimap";

interface SoloHudProps {
  snap: SoloSnapshot;
  fps?: number;
  showFps: boolean;
  tip?: string;
  onDomain: () => void;
  onPause: () => void;
  onDash: () => void;
  onUlt: () => void;
  /** Caller opens the detail modal when a chip is tapped (Tier 5 #20). */
  onTechChipClick?: (id: string) => void;
}

export function SoloHud({
  snap,
  fps,
  showFps,
  tip,
  onDomain,
  onPause,
  onDash,
  onUlt,
  onTechChipClick,
}: SoloHudProps) {
  const p = snap.player;
  const remaining = Math.max(0, RUN_DURATION_SEC - Math.floor(snap.elapsed));
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  // Scaled level curve: each successive level costs ~15% more XP than the
  // last, so the bar fills in real time even when `p.xp` is a running total.
  const { intoLevel: xpIntoLevel, need: xpNeed } = levelFromXp(p.xp);
  const xpPct = (xpIntoLevel / xpNeed) * 100;
  const hpPct = (p.hp / p.maxHp) * 100;
  const lowHp = hpPct < 25 && !p.downed;
  // Boss spawns at 180s elapsed — show a countdown plate in the final 45s.
  const untilBossSec = Math.max(0, 180 - Math.floor(snap.elapsed));
  const showBossWarning = !snap.bossSpawned && untilBossSec > 0 && untilBossSec <= 45;

  return (
    <>
      {lowHp && <div className="low-hp-vignette" aria-hidden />}
      {snap.bossSpawned && (
        <div className="boss-bar-wrap">
          <div className="boss-bar-label">Special Grade</div>
          <div className="boss-bar-track">
            <div
              className="boss-bar-fill"
              style={{
                width: `${(snap.bossHp / snap.bossMaxHp) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
      <div className="hud-top">
        <div>
          <div className="hud-plate">
            {mins}:{secs.toString().padStart(2, "0")} · Lv.{p.level}
          </div>
          {snap.bossSpawned && (
            <div className="hud-plate boss-plate">
              BOSS {Math.ceil((snap.bossHp / snap.bossMaxHp) * 100)}%
              {snap.bossPhase > 1 ? " · PHASE 2" : ""}
            </div>
          )}
          {showBossWarning && (
            <div className="hud-plate warn-plate">
              Boss in {untilBossSec}s
            </div>
          )}
          {p.invulnSec > 0.6 && (
            <div className="hud-plate shield-plate">
              Spawn shield {p.invulnSec.toFixed(1)}s
            </div>
          )}
          {p.streak >= 5 && (
            <div className="hud-plate streak-plate">
              {p.streak} streak · x{p.streakMultiplier.toFixed(2)}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="hud-plate">Exorcised {snap.exorcismCount}</div>
          {showFps && fps !== undefined && (
            <div className="hud-plate">{Math.round(fps)} FPS</div>
          )}
        </div>
      </div>

      <div className="hp-xp-column">
        <div className="bar-label">
          HP <span style={{ float: "right", opacity: 0.85 }}>{Math.round(p.hp)}/{p.maxHp}</span>
        </div>
        <div className={`bar-track ${p.regenActive ? "bar-track-regen" : ""}`}>
          <div
            className="bar-fill hp-fill"
            style={{ width: `${Math.max(0, hpPct)}%` }}
          />
        </div>
        <div className="bar-label">
          XP <span style={{ float: "right", opacity: 0.85 }}>{Math.floor(xpIntoLevel)}/{Math.round(xpNeed)}</span>
        </div>
        <div className="bar-track">
          <div className="bar-fill xp-fill" style={{ width: `${xpPct}%` }} />
        </div>
      </div>

      {/* Technique / upgrade list moved to start-menu stats (QoL). */}

      <Minimap snap={snap} />

      {tip && <div className="tip-toast panel">{tip}</div>}

      <button
        type="button"
        className="btn btn-ghost hud-pause-btn"
        onClick={onPause}
        aria-label="Pause"
      >
        ⏸
      </button>

      <button
        type="button"
        className="btn btn-ghost dash-btn"
        onClick={onDash}
        disabled={p.dashCdSec > 0}
        aria-label="Dash"
        style={{
          ["--dash-progress" as never]: 1 - Math.min(1, p.dashCdSec / p.dashCdMax),
        }}
      >
        <span className="dash-glyph" aria-hidden>»</span>
        <span className="dash-label">
          {p.dashCdSec > 0 ? `${p.dashCdSec.toFixed(1)}s` : "Dash"}
        </span>
      </button>

      {!p.domainUsed && (
        <button
          type="button"
          className="btn btn-primary domain-btn"
          onClick={onDomain}
        >
          Domain
        </button>
      )}

      {/* Ultimate button (Tier 2 #10) — surfaces once the meter is full,
       *  pulses while ready, fades out otherwise so it doesn't compete with
       *  Domain visually until it matters. */}
      <button
        type="button"
        className={`btn btn-ult ${p.ultPct >= 1 ? "ready" : ""} ${p.ultActive ? "active" : ""}`}
        onClick={onUlt}
        disabled={p.ultPct < 1 || p.ultActive}
        aria-label="Ultimate"
        style={{ ["--ult-progress" as never]: p.ultPct }}
      >
        <span className="ult-label">{p.ultActive ? "ULT!" : p.ultPct >= 1 ? "Ultimate" : `${Math.round(p.ultPct * 100)}%`}</span>
      </button>

      {snap.practiceDps > 0 && (
        <div className="hud-plate practice-plate">
          DPS {snap.practiceDps.toFixed(0)}
        </div>
      )}
    </>
  );
}
