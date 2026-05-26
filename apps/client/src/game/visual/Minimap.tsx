import type { SoloSnapshot } from "../solo/SoloEngine";

interface MinimapProps {
  snap: SoloSnapshot;
}

const SIZE = 88;
const SCALE = 0.035;

export function Minimap({ snap }: MinimapProps) {
  const p = snap.player;
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  return (
    <div className="minimap panel">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <rect width={SIZE} height={SIZE} fill="rgba(0,0,0,0.5)" rx="8" />
        {snap.enemies.slice(0, 40).map((e) => (
          <circle
            key={e.id}
            cx={cx + e.x * SCALE}
            cy={cy + e.y * SCALE}
            r={e.boss ? 4 : e.elite ? 2.5 : 1.5}
            fill={e.boss ? "#ef4444" : e.elite ? "#c084fc" : "#7b5cff"}
            opacity={0.85}
          />
        ))}
        {snap.pickups.slice(0, 24).map((g) => (
          <circle
            key={g.id}
            cx={cx + g.x * SCALE}
            cy={cy + g.y * SCALE}
            r={g.kind === "health" ? 2 : g.kind === "bomb" ? 2 : 1}
            fill={
              g.kind === "health"
                ? "#22c55e"
                : g.kind === "bomb"
                ? "#ef4444"
                : "#60a5fa"
            }
            opacity={g.kind === "xp" ? 0.6 : 0.9}
          />
        ))}
        <circle cx={cx + p.x * SCALE} cy={cy + p.y * SCALE} r={4} fill="#f1f5f9" />
        <circle
          cx={cx + p.x * SCALE}
          cy={cy + p.y * SCALE}
          r={6}
          fill="none"
          stroke="#9b7bff"
          strokeWidth={1.5}
          opacity={0.8}
        />
      </svg>
    </div>
  );
}
