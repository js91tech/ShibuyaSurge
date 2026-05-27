import type { ReactNode } from "react";
import { CHARACTER_LIST } from "@jjk/game-core";
import type { CharacterId } from "@jjk/game-core";
import { usePortrait } from "./usePortrait";

function CharacterPortrait({ characterId }: { characterId: string }) {
  const src = usePortrait(`player_${characterId}`);
  return (
    <div className="char-card-portrait-wrap">
      <img
        className="char-card-portrait"
        src={src}
        alt=""
        draggable={false}
      />
    </div>
  );
}

interface SoloLobbyProps {
  selected: CharacterId;
  onSelect: (id: CharacterId) => void;
  onStart: () => void;
  onBack: () => void;
  /** Optional pre-run controls (mutator + stage pickers) the caller renders. */
  extras?: ReactNode;
}

export function SoloLobby({ selected, onSelect, onStart, onBack, extras }: SoloLobbyProps) {
  return (
    <div className="lobby-overlay">
      <div className="lobby-scroll">
        <h1 className="lobby-heading">Choose your sorcerer</h1>
        <div className="character-grid">
          {CHARACTER_LIST.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`char-card ${selected === c.id ? "selected" : ""}`}
              onClick={() => onSelect(c.id)}
            >
              <CharacterPortrait characterId={c.id} />
              <h3>{c.name}</h3>
              <p>{c.role}</p>
            </button>
          ))}
        </div>
        {extras}
      </div>
      <div className="lobby-footer">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn-primary btn-large" onClick={onStart}>
          Start Exorcism
        </button>
      </div>
    </div>
  );
}
