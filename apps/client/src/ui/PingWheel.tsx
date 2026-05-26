import { useEffect } from "react";
import type { PingTag } from "../game/eventBus";

interface PingWheelProps {
  onPick: (tag: PingTag) => void;
  onClose: () => void;
}

const TAGS: { id: PingTag; label: string }[] = [
  { id: "here", label: "Here" },
  { id: "help", label: "Help!" },
  { id: "regroup", label: "Regroup" },
  { id: "boss", label: "Boss" },
];

export function PingWheel({ onPick, onClose }: PingWheelProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="ping-wheel-backdrop" onClick={onClose}>
      <div className="ping-wheel" onClick={(e) => e.stopPropagation()}>
        {TAGS.map((t, i) => {
          const angle = (i / TAGS.length) * Math.PI * 2 - Math.PI / 2;
          const r = 80;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          return (
            <button
              key={t.id}
              type="button"
              className="ping-wheel-btn btn"
              style={{ transform: `translate(${x}px, ${y}px)` }}
              onClick={() => onPick(t.id)}
            >
              {t.label}
            </button>
          );
        })}
        <div className="ping-wheel-center">Ping</div>
      </div>
    </div>
  );
}
