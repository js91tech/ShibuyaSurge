import { useState } from "react";
import { TECHNIQUES } from "@jjk/game-core";

interface DraftOverlayProps {
  options: string[];
  /** Currently owned techniques — used to render synergy hints */
  ownedTechniqueIds?: string[];
  rerollsRemaining?: number;
  banishesRemaining?: number;
  onPick: (techniqueId: string) => void;
  onRandom?: () => void;
  onReroll?: () => void;
  onBanish?: (id: string) => void;
}

function synergyHintsFor(id: string, owned: Set<string>): string[] {
  const hints: string[] = [];
  if (id === "blue_pull" && (owned.has("red_push") || owned.has("divergent_fist"))) {
    hints.push("Combos with AoE techniques");
  }
  if (id === "red_push" && (owned.has("blue_pull") || owned.has("divergent_fist"))) {
    hints.push("Pairs with Blue / Divergent Fist");
  }
  if (id === "black_flash" && owned.has("divergent_fist")) {
    hints.push("Crits boost Divergent Fist");
  }
  if (id === "resonance" && owned.has("straw_doll")) {
    hints.push("Chains off Straw Doll hits");
  }
  if (id === "nue_bomb" && owned.has("divine_dogs")) {
    hints.push("Stacks with shikigami");
  }
  if (id === "movement_speed") hints.push("Helps avoid boss telegraphs");
  return hints;
}

export function DraftOverlay({
  options,
  ownedTechniqueIds = [],
  rerollsRemaining = 0,
  banishesRemaining = 0,
  onPick,
  onRandom,
  onReroll,
  onBanish,
}: DraftOverlayProps) {
  const [banishMode, setBanishMode] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const owned = new Set(ownedTechniqueIds);

  return (
    <div className="draft-overlay">
      <h2 style={{ fontSize: "1rem" }}>Cursed Technique Upgrade</h2>
      <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
        Choose one — time slowed for party
      </p>
      {options.map((id) => {
        const t = TECHNIQUES[id as keyof typeof TECHNIQUES];
        const isConfirm = confirmId === id;
        if (banishMode) {
          return (
            <button
              key={id}
              type="button"
              className="draft-card banish-card"
              onClick={() => {
                onBanish?.(id);
                setBanishMode(false);
              }}
            >
              <strong>Banish: {t?.name ?? id}</strong>
              <p style={{ fontSize: "0.7rem", color: "var(--accent-danger)", marginTop: 4 }}>
                Removes this option from the rest of the run
              </p>
            </button>
          );
        }
        const hints = synergyHintsFor(id, owned);
        const isUpgrade = owned.has(id);
        return (
          <button
            key={id}
            type="button"
            className={`draft-card ${isConfirm ? "confirm" : ""}`}
            onClick={() => (isConfirm ? onPick(id) : setConfirmId(id))}
            onMouseLeave={() => setConfirmId(null)}
          >
            <strong>{t?.name ?? id} {isUpgrade && <span className="draft-upgrade">UPGRADE</span>}</strong>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
              {t?.description ?? ""}
            </p>
            {hints.map((h, i) => (
              <p key={i} className="draft-synergy">↳ {h}</p>
            ))}
            {isConfirm && (
              <p style={{ fontSize: "0.7rem", color: "var(--accent-curse)", marginTop: 6 }}>
                Click again to confirm
              </p>
            )}
          </button>
        );
      })}

      <div className="draft-actions">
        {onReroll && rerollsRemaining > 0 && !banishMode && (
          <button type="button" className="btn btn-secondary" onClick={onReroll}>
            Reroll ({rerollsRemaining})
          </button>
        )}
        {onBanish && banishesRemaining > 0 && (
          <button
            type="button"
            className={`btn ${banishMode ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setBanishMode((m) => !m)}
          >
            {banishMode ? "Cancel banish" : `Banish (${banishesRemaining})`}
          </button>
        )}
        {onRandom && !banishMode && options.length > 1 && (
          <button type="button" className="btn btn-secondary" onClick={onRandom}>
            Random pick
          </button>
        )}
      </div>
    </div>
  );
}
