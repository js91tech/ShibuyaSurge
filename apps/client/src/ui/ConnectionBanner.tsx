import type { ConnectionState } from "../game/GameClient";

interface ConnectionBannerProps {
  state: ConnectionState;
  pingMs: number;
  onLeave: () => void;
}

export function ConnectionBanner({ state, pingMs, onLeave }: ConnectionBannerProps) {
  if (state === "reconnecting") {
    return <div className="conn-banner reconnecting">Connection lost — reconnecting…</div>;
  }
  if (state === "lost") {
    return (
      <div className="conn-banner lost">
        Connection lost.{" "}
        <button type="button" className="btn btn-secondary" onClick={onLeave}>
          Back to menu
        </button>
      </div>
    );
  }
  if (state === "connected" && pingMs > 0) {
    const cls = pingMs < 80 ? "good" : pingMs < 200 ? "ok" : "bad";
    return <div className={`ping-chip hud-plate ${cls}`}>{Math.round(pingMs)} ms</div>;
  }
  return null;
}
