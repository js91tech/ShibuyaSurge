import { TECHNIQUES, SYNERGY_PAIRS, type TechniqueId } from "@jjk/game-core";
import type { SoloTechnique } from "../game/solo/SoloEngine";

interface TechniqueDetailModalProps {
  technique: SoloTechnique;
  ownedIds: TechniqueId[];
  onClose: () => void;
}

/** Detail card surfaced when the player taps a technique chip on the HUD
 *  (Tier 5 #20). Shows description, current level, scaling info, and any
 *  active synergy pair this tech contributes to. */
export function TechniqueDetailModal({
  technique,
  ownedIds,
  onClose,
}: TechniqueDetailModalProps) {
  const def = TECHNIQUES[technique.id];
  if (!def) return null;
  const owned = new Set(ownedIds);
  const synergies = SYNERGY_PAIRS.filter(
    (p) => p.ids.includes(technique.id) && p.ids.every((id) => owned.has(id))
  );
  const possibleSynergies = SYNERGY_PAIRS.filter(
    (p) => p.ids.includes(technique.id) && !p.ids.every((id) => owned.has(id))
  );

  return (
    <div
      className="overlay-panel tech-detail-overlay"
      role="dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tech-detail-card panel">
        <h3 className="tech-detail-name">{def.name}</h3>
        <div className="tech-detail-lv">Lv. {technique.level} / {def.maxLevel}</div>
        <p className="tech-detail-desc">{def.description}</p>
        {technique.cooldownMax !== undefined && (
          <div className="tech-detail-row">
            <span>Cooldown</span>
            <span>{technique.cooldownMax.toFixed(2)}s</span>
          </div>
        )}
        {synergies.length > 0 && (
          <div className="tech-detail-synergies">
            <div className="tech-detail-synergy-title">Active synergies</div>
            {synergies.map((s) => (
              <div key={s.label} className="tech-detail-synergy active">
                {s.label}
              </div>
            ))}
          </div>
        )}
        {possibleSynergies.length > 0 && (
          <div className="tech-detail-synergies">
            <div className="tech-detail-synergy-title">Potential synergies</div>
            {possibleSynergies.map((s) => {
              const need = s.ids.find((id) => !owned.has(id));
              return (
                <div key={s.label} className="tech-detail-synergy locked">
                  {s.label}
                  {need && (
                    <span className="tech-detail-need">
                      {" "}— needs {TECHNIQUES[need]?.name ?? need}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
