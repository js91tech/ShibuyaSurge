import { useEffect, useRef } from "react";
import type { ReplayFrame } from "../game/solo/replayBuffer";

interface DeathReplayViewerProps {
  frames: ReplayFrame[];
}

/** Plays back the last few seconds captured in the replay ring buffer. */
export function DeathReplayViewer({ frames }: DeathReplayViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let idx = 0;
    const w = canvas.width;
    const h = canvas.height;

    const drawFrame = (frame: ReplayFrame) => {
      ctx.fillStyle = "#0a0b14";
      ctx.fillRect(0, 0, w, h);

      let minX = frame.player.x;
      let maxX = frame.player.x;
      let minY = frame.player.y;
      let maxY = frame.player.y;
      for (const e of frame.enemies) {
        minX = Math.min(minX, e.x);
        maxX = Math.max(maxX, e.x);
        minY = Math.min(minY, e.y);
        maxY = Math.max(maxY, e.y);
      }
      const pad = 120;
      minX -= pad;
      minY -= pad;
      maxX += pad;
      maxY += pad;
      const spanX = Math.max(maxX - minX, 1);
      const spanY = Math.max(maxY - minY, 1);
      const scale = Math.min(w / spanX, h / spanY) * 0.9;
      const ox = (w - spanX * scale) / 2 - minX * scale;
      const oy = (h - spanY * scale) / 2 - minY * scale;

      const tx = (x: number, y: number) => [x * scale + ox, y * scale + oy] as const;

      for (const p of frame.projectiles) {
        const [px, py] = tx(p.x, p.y);
        ctx.fillStyle = "rgba(192, 132, 252, 0.5)";
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const e of frame.enemies) {
        const [ex, ey] = tx(e.x, e.y);
        const r = e.boss ? 6 : e.elite ? 4 : 2.5;
        ctx.fillStyle = e.boss ? "#f97316" : e.elite ? "#a855f7" : "#64748b";
        ctx.beginPath();
        ctx.arc(ex, ey, r, 0, Math.PI * 2);
        ctx.fill();
      }

      const [px, py] = tx(frame.player.x, frame.player.y);
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(34, 211, 238, 0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const timer = window.setInterval(() => {
      drawFrame(frames[idx]!);
      idx = (idx + 1) % frames.length;
    }, 50);

    drawFrame(frames[0]!);

    return () => clearInterval(timer);
  }, [frames]);

  if (frames.length < 2) return null;

  return (
    <div className="death-replay-wrap panel">
      <div className="death-replay-label">Last moments</div>
      <canvas ref={canvasRef} className="death-replay-canvas" width={320} height={180} />
      <p className="death-replay-hint">Cyan = you · Purple = elite · Orange = boss</p>
    </div>
  );
}
