import { RUN_DURATION_SEC, TECHNIQUES, levelFromXp } from "@jjk/game-core";
import type { GameRoomState } from "@jjk/shared-protocol";
import { OnlineMinimap } from "../game/visual/OnlineMinimap";

interface HudProps {
  state: GameRoomState;
  sessionId: string | null;
  fps?: number;
  showFps: boolean;
  tip?: string;
  largeTouch?: boolean;
  onDomain: () => void;
  onPause: () => void;
  onPing?: () => void;
}

export function Hud({
  state,
  sessionId,
  fps,
  showFps,
  tip,
  largeTouch,
  onDomain,
  onPause,
  onPing,
}: HudProps) {
  const me = sessionId ? state.players.get(sessionId) : null;
  const elapsed = Math.floor(state.elapsed);
  const remaining = Math.max(0, RUN_DURATION_SEC - elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const players = [...state.players.values()];

  // Scaled level curve — each level costs ~15% more XP than the previous.
  const xpProgress = me ? levelFromXp(me.xp) : { intoLevel: 0, need: 1 };
  const xpPct = me ? (xpProgress.intoLevel / xpProgress.need) * 100 : 0;
  const hpPct = me ? (me.hp / me.maxHp) * 100 : 0;
  const lowHp = me ? hpPct < 25 && !me.downed && !me.spectating : false;

  const domainBlocked =
    !!state.domainOwnerSessionId &&
    state.domainOwnerSessionId !== sessionId &&
    [...state.players.values()].some((p) => p.domainActive);

  return (
    <>
      {lowHp && <div className="low-hp-vignette" aria-hidden />}
      {state.bossSpawned && (
        <div className="boss-bar-wrap">
          <div className="boss-bar-label">Special Grade</div>
          <div className="boss-bar-track">
            <div
              className="boss-bar-fill"
              style={{ width: `${(state.bossHp / state.bossMaxHp) * 100}%` }}
            />
          </div>
        </div>
      )}
      <div className="hud-top">
        <div>
          <div className="hud-plate">
            {mins}:{secs.toString().padStart(2, "0")} · Wave {state.wave}
            {me ? ` · Lv.${me.level}` : ""}
          </div>
          {state.bossSpawned && (
            <div className="hud-plate boss-plate">
              BOSS {Math.ceil((state.bossHp / state.bossMaxHp) * 100)}%
              {state.bossPhase > 1 ? " · PHASE 2" : ""}
            </div>
          )}
          {remaining <= 60 && !state.bossSpawned && (
            <div className="hud-plate warn-plate">Boss approaching…</div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          {me && (
            <div className="hud-plate">
              HP {Math.ceil(me.hp)}/{me.maxHp}
            </div>
          )}
          <div className="hud-plate" style={{ marginTop: 4 }}>
            Exorcised {state.exorcismCount}
          </div>
          {showFps && fps !== undefined && (
            <div className="hud-plate">{Math.round(fps)} FPS</div>
          )}
        </div>
      </div>

      {me && !me.spectating && (
        <div className="hp-xp-column">
          <div className="bar-label">HP</div>
          <div className="bar-track">
            <div className="bar-fill hp-fill" style={{ width: `${Math.max(0, hpPct)}%` }} />
          </div>
          <div className="bar-label">XP</div>
          <div className="bar-track">
            <div className="bar-fill xp-fill" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      )}

      {/* Technique / upgrade list moved to start-menu stats (QoL). */}

      <OnlineMinimap state={state} sessionId={sessionId} />

      <div className="party-strip">
        {players.map((p) => (
          <div
            key={p.sessionId}
            className={`hud-plate party-chip ${p.sessionId === sessionId ? "self" : ""}`}
            style={{
              opacity: p.spectating ? 0.45 : 1,
              borderColor: p.downed ? "var(--accent-danger)" : undefined,
            }}
          >
            {p.username}
            {p.downed ? " ↓" : ""}
            {p.spectating ? " 👁" : ""}
            {p.domainActive ? " ◈" : ""}
          </div>
        ))}
      </div>

      {tip && <div className="tip-toast panel">{tip}</div>}

      <button
        type="button"
        className="btn btn-ghost hud-pause-btn"
        onClick={onPause}
        aria-label="Pause"
      >
        ⏸
      </button>

      {onPing && (
        <button
          type="button"
          className="btn btn-ghost hud-ping-btn"
          onClick={onPing}
          aria-label="Ping teammates"
          title="Ping (V)"
        >
          📍
        </button>
      )}

      {me && !me.domainUsed && !me.downed && !me.spectating && !domainBlocked && (
        <button
          type="button"
          className={`btn btn-primary domain-btn ${largeTouch ? "domain-btn-large" : ""}`}
          onClick={onDomain}
        >
          Domain
        </button>
      )}
    </>
  );
}
