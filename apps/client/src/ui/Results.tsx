import { loadHighScore } from "../game/settings";

import { talismansFromRun } from "../meta/metaApi";

import { TECHNIQUES, type TechniqueId } from "@jjk/game-core";

import type { RunTelemetry } from "../game/solo/SoloEngine";
import type { ReplayFrame } from "../game/solo/replayBuffer";



interface ResultsProps {

  grade: string;

  exorcismCount: number;

  onReturn: () => void;

  onRetry?: () => void;

  subtitle?: string;

  talismanEarned?: number;

  totalTalismans?: number | null;

  telemetry?: RunTelemetry;

  durationSec?: number;

  characterId?: string;

  replayFrames?: ReplayFrame[];

}



export function Results({

  grade,

  exorcismCount,

  onReturn,

  onRetry,

  subtitle,

  talismanEarned,

  totalTalismans,

  telemetry,

  durationSec,

  characterId,

  replayFrames,

}: ResultsProps) {

  const shareText = `I survived ${formatDuration(durationSec ?? 0)} as ${characterId ?? "an exorcist"} in JJK Survivors — ${grade}, ${exorcismCount} spirits exorcised.`;

  const handleShare = async () => {
    // Use the native Share Sheet on mobile when available; fall back to
    // clipboard so desktop browsers can still post-and-share.
    try {
      const nav = navigator as Navigator & {
        share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
      };
      if (nav.share) {
        await nav.share({ title: "JJK Survivors", text: shareText, url: location.origin });
        return;
      }
    } catch {
      /* user cancelled — fall through */
    }
    try {
      await navigator.clipboard.writeText(shareText);
      alert("Score copied to clipboard!");
    } catch {
      prompt("Share your run:", shareText);
    }
  };

  const handleReplayExport = () => {
    if (!replayFrames || !replayFrames.length) return;
    const payload = {
      characterId,
      grade,
      exorcisms: exorcismCount,
      durationSec,
      frames: replayFrames,
      capturedAt: Date.now(),
    };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jjk-survivors-${Date.now()}.replay.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const best = loadHighScore();

  const isRecord = exorcismCount >= best && exorcismCount > 0;

  const earned = talismanEarned ?? talismansFromRun(exorcismCount);



  return (

    <div className="lobby-overlay panel" style={{ margin: 16, padding: 24 }}>

      <h1 style={{ fontSize: "1.25rem" }}>Exorcism Complete</h1>

      {subtitle && <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{subtitle}</p>}

      <p style={{ fontSize: "2rem", margin: "16px 0", color: "#c084fc" }}>{grade}</p>

      <p style={{ color: "var(--text-muted)" }}>

        Spirits exorcised: <strong>{exorcismCount}</strong>

      </p>

      <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 8 }}>

        Cursed Talismans earned: +{earned}

        {totalTalismans != null && (

          <span> · Total balance: {totalTalismans}</span>

        )}

        {isRecord && <span className="record-badge"> · New record!</span>}

      </p>

      {best > 0 && (

        <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>

          Personal best: {best} exorcisms

        </p>

      )}

      {telemetry && (

        <div className="run-summary panel" style={{ marginTop: 16 }}>

          <div className="run-summary-row">

            <span>Duration</span>

            <strong>{formatDuration(durationSec ?? 0)}</strong>

          </div>

          <div className="run-summary-row">

            <span>Max kill streak</span>

            <strong>{telemetry.maxStreak}</strong>

          </div>

          <div className="run-summary-row">

            <span>Dashes used</span>

            <strong>{telemetry.dashesUsed}</strong>

          </div>

          <div className="run-summary-row">

            <span>Damage taken</span>

            <strong>{telemetry.damageTaken}</strong>

          </div>

          {telemetry.techDamage.length > 0 && (

            <>

              <div className="run-summary-divider" />

              <div className="run-summary-title">Technique damage</div>

              {telemetry.techDamage.slice(0, 6).map((row) => (

                <div key={row.id} className="run-summary-row">

                  <span>{TECHNIQUES[row.id as TechniqueId]?.name ?? row.id}</span>

                  <strong>{row.damage.toLocaleString()}</strong>

                </div>

              ))}

            </>

          )}

        </div>

      )}

      <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>

        {onRetry && (

          <button type="button" className="btn btn-primary" onClick={onRetry}>

            Run it back

          </button>

        )}

        <button type="button" className="btn btn-secondary" onClick={handleShare}>

          Share

        </button>

        {replayFrames && replayFrames.length > 0 && (

          <button type="button" className="btn btn-secondary" onClick={handleReplayExport}>

            Export replay

          </button>

        )}

        <button type="button" className={onRetry ? "btn btn-ghost" : "btn btn-primary"} onClick={onReturn}>

          Return to menu

        </button>

      </div>

    </div>

  );

}

function formatDuration(sec: number): string {

  const m = Math.floor(sec / 60);

  const s = sec % 60;

  return `${m}:${s.toString().padStart(2, "0")}`;

}

