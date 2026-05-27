import { useState } from "react";
import {
  CHARACTER_LIST,
  SYNERGY_PAIRS,
  TECHNIQUE_LIST,
  TECHNIQUES,
  type CharacterId,
  type TechniqueId,
} from "@jjk/game-core";

interface TechniqueGrimoireProps {
  onClose: () => void;
}

export function TechniqueGrimoire({ onClose }: TechniqueGrimoireProps) {
  const [charId, setCharId] = useState<CharacterId>("yuji");
  const char = CHARACTER_LIST.find((c) => c.id === charId);

  const techniques = TECHNIQUE_LIST.filter(
    (t) => !t.characterIds?.length || t.characterIds.includes(charId)
  );

  const synergiesForChar = SYNERGY_PAIRS.filter((s) =>
    s.ids.some((id) => {
      const def = TECHNIQUES[id];
      return !def?.characterIds?.length || def.characterIds.includes(charId);
    })
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal panel grimoire-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Cursed Technique Grimoire</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: 12 }}>
          Reference for draft picks and synergies. In-run, tap a technique chip on the HUD for details.
        </p>

        <div className="grimoire-char-row">
          {CHARACTER_LIST.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`btn btn-secondary grimoire-char-btn ${charId === c.id ? "selected" : ""}`}
              onClick={() => setCharId(c.id as CharacterId)}
            >
              {c.name.split(" ")[0]}
            </button>
          ))}
        </div>

        {char && (
          <p className="grimoire-char-blurb">
            <strong>{char.name}</strong> — {char.role} · Starter:{" "}
            {TECHNIQUES[char.starterTechnique as TechniqueId]?.name ?? char.starterTechnique}
          </p>
        )}

        <ul className="grimoire-tech-list">
          {techniques.map((t) => (
            <li key={t.id} className="grimoire-tech-item panel">
              <div className="grimoire-tech-head">
                <strong>{t.name}</strong>
                <span className="grimoire-tech-meta">max Lv. {t.maxLevel}</span>
              </div>
              <p className="grimoire-tech-desc">{t.description}</p>
              {t.tags && t.tags.length > 0 && (
                <div className="grimoire-tags">
                  {t.tags.map((tag) => (
                    <span key={tag} className="grimoire-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>

        {synergiesForChar.length > 0 && (
          <>
            <h3 className="settings-section">Synergies</h3>
            <ul className="grimoire-synergy-list">
              {synergiesForChar.map((s) => (
                <li key={s.label} className="grimoire-synergy-item">
                  <strong>{s.label}</strong>
                  <span>
                    {TECHNIQUES[s.ids[0]]?.name} + {TECHNIQUES[s.ids[1]]?.name}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
