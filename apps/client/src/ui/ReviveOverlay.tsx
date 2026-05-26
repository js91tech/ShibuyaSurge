import { REVIVE_CHANNEL_SEC } from "@jjk/game-core";
import type { GameRoomState } from "@jjk/shared-protocol";

const REVIVE_RANGE = 80;

interface ReviveOverlayProps {
  state: GameRoomState;
  sessionId: string | null;
}

export function ReviveOverlay({ state, sessionId }: ReviveOverlayProps) {
  const me = sessionId ? state.players.get(sessionId) : null;
  if (!me || state.phase !== "run") return null;

  if (me.downed) {
    const pct = Math.min(100, (me.reviveProgress / REVIVE_CHANNEL_SEC) * 100);
    return (
      <div className="revive-overlay panel">
        <p className="revive-title">Down — stay close to a teammate</p>
        <div className="revive-track">
          <div className="revive-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="revive-hint">
          {pct > 0 ? `Reviving… ${Math.ceil(REVIVE_CHANNEL_SEC - me.reviveProgress)}s` : "Waiting for ally (5s channel)"}
        </p>
      </div>
    );
  }

  if (me.spectating) {
    return (
      <div className="revive-overlay panel spectate-banner">
        <p className="revive-title">Spectating — follow your squad</p>
        <p className="revive-hint">You will return if the exorcism succeeds</p>
      </div>
    );
  }

  const downed = [...state.players.values()].filter((p) => p.downed && p.sessionId !== sessionId);
  if (!downed.length) return null;

  const target = downed[0];
  const dist = Math.hypot(target.x - me.x, target.y - me.y);
  if (dist > REVIVE_RANGE * 1.2) return null;

  const pct = Math.min(100, (target.reviveProgress / REVIVE_CHANNEL_SEC) * 100);

  return (
    <div className="revive-overlay panel revive-channel">
      <p className="revive-title">Reviving {target.username}</p>
      <div className="revive-track">
        <div className="revive-fill ally" style={{ width: `${pct}%` }} />
      </div>
      <p className="revive-hint">Hold position — {Math.ceil(REVIVE_CHANNEL_SEC - target.reviveProgress)}s</p>
    </div>
  );
}
