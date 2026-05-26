import { useEffect, useState } from "react";
import { eventBus, type GameEvent } from "../game/eventBus";
import { audioManager } from "../audio/AudioManager";

interface Toast {
  id: number;
  message: string;
  tone: "info" | "warn" | "achieve" | "ally";
  ttl: number;
}

let toastId = 0;

function toastFor(e: GameEvent): Toast | null {
  switch (e.kind) {
    case "boss_spawn":
      return {
        id: ++toastId,
        message: `${e.label ?? "Special Grade"} has appeared!`,
        tone: "warn",
        ttl: 4500,
      };
    case "boss_phase2":
      return { id: ++toastId, message: "Boss enters phase 2", tone: "warn", ttl: 3500 };
    case "boss_defeated":
      return { id: ++toastId, message: "Special Grade exorcised", tone: "achieve", ttl: 4500 };
    case "level_up":
      return { id: ++toastId, message: `Level ${e.level}`, tone: "info", ttl: 2200 };
    case "downed":
      return { id: ++toastId, message: `${e.username} is down`, tone: "warn", ttl: 4000 };
    case "revived":
      return { id: ++toastId, message: `${e.username} revived`, tone: "ally", ttl: 3000 };
    case "domain":
      return { id: ++toastId, message: `${e.username}: Domain Expansion`, tone: "achieve", ttl: 3500 };
    case "achievement":
      return { id: ++toastId, message: `Achievement: ${e.label}`, tone: "achieve", ttl: 5500 };
    case "streak":
      return {
        id: ++toastId,
        message: `${e.kills} streak · x${e.multiplier.toFixed(2)} XP`,
        tone: "achieve",
        ttl: 2200,
      };
    case "info":
      return { id: ++toastId, message: e.message, tone: "info", ttl: 3000 };
    default:
      return null;
  }
}

export function ToastFeed() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return eventBus.on((e) => {
      const t = toastFor(e);
      if (!t) return;
      if (e.kind === "achievement") audioManager.playAchievement();
      setToasts((prev) => [...prev.slice(-4), t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, t.ttl);
    });
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="toast-feed" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
