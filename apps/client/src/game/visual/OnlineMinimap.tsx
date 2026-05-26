import type { GameRoomState } from "@jjk/shared-protocol";

interface OnlineMinimapProps {
  state: GameRoomState;
  sessionId: string | null;
}

const SIZE = 88;
const SCALE = 0.035;

export function OnlineMinimap({ state, sessionId }: OnlineMinimapProps) {
  const me = sessionId ? state.players.get(sessionId) : null;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const focus = me && !me.spectating ? me : [...state.players.values()].find((p) => !p.downed);

  return (
    <div className="minimap panel">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <rect width={SIZE} height={SIZE} fill="rgba(0,0,0,0.5)" rx="8" />
        {state.enemies.slice(0, 40).map((e) => (
          <circle
            key={e.id}
            cx={cx + e.x * SCALE}
            cy={cy + e.y * SCALE}
            r={e.boss ? 4 : e.elite ? 2.5 : 1.5}
            fill={e.boss ? "#ef4444" : e.elite ? "#c084fc" : "#7b5cff"}
            opacity={0.85}
          />
        ))}
        {state.pickups.slice(0, 20).map((g) => (
          <circle
            key={g.id}
            cx={cx + g.x * SCALE}
            cy={cy + g.y * SCALE}
            r={1}
            fill="#60a5fa"
            opacity={0.6}
          />
        ))}
        {[...state.players.values()].map((p) => (
          <circle
            key={p.sessionId}
            cx={cx + p.x * SCALE}
            cy={cy + p.y * SCALE}
            r={p.sessionId === sessionId ? 4 : 3}
            fill={p.downed ? "#ef4444" : p.sessionId === sessionId ? "#f1f5f9" : "#94a3b8"}
            opacity={p.spectating ? 0.35 : 0.9}
          />
        ))}
        {focus && (
          <circle
            cx={cx + focus.x * SCALE}
            cy={cy + focus.y * SCALE}
            r={6}
            fill="none"
            stroke="#9b7bff"
            strokeWidth={1.5}
            opacity={0.8}
          />
        )}
      </svg>
    </div>
  );
}
