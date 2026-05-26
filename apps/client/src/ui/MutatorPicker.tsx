import { useState } from "react";
import { MUTATORS, type MutatorId } from "@jjk/game-core";

interface MutatorPickerProps {
  selected: MutatorId[];
  onChange: (ids: MutatorId[]) => void;
}

/** Compact toggle panel embedded in the solo lobby. Player can pick 0–3
 *  mutators; the selection persists across runs via parent state. */
export function MutatorPicker({ selected, onChange }: MutatorPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(selected);

  const toggle = (id: MutatorId) => {
    if (selectedSet.has(id)) {
      onChange(selected.filter((s) => s !== id));
    } else if (selected.length < 3) {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="mutator-picker">
      <button
        type="button"
        className="btn btn-secondary mutator-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Mutators ({selected.length}/3) {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="mutator-grid">
          {MUTATORS.map((m) => {
            const on = selectedSet.has(m.id);
            const disabled = !on && selected.length >= 3;
            return (
              <button
                key={m.id}
                type="button"
                className={`mutator-card ${on ? "selected" : ""}`}
                onClick={() => toggle(m.id)}
                disabled={disabled}
                style={{
                  borderColor: on ? `#${m.color.toString(16).padStart(6, "0")}` : undefined,
                }}
              >
                <div className="mutator-card-name">{m.name}</div>
                <div className="mutator-card-blurb">{m.blurb}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
