import { STAGES, type StageId } from "@jjk/game-core";

interface StagePickerProps {
  selected: StageId;
  onChange: (id: StageId) => void;
}

export function StagePicker({ selected, onChange }: StagePickerProps) {
  return (
    <div className="stage-picker">
      <div className="stage-picker-label">Stage</div>
      <div className="stage-grid">
        {STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`stage-card ${selected === s.id ? "selected" : ""}`}
            onClick={() => onChange(s.id)}
            title={s.blurb}
          >
            <div
              className="stage-swatch"
              style={{
                // Use the boss tint as the swatch color — it's always
                // distinct (floorTint can be 0x000000 for the base stage),
                // and it sets the mood of the stage at a glance.
                background: `linear-gradient(135deg, #${s.bossTint
                  .toString(16)
                  .padStart(6, "0")}, #${s.domainTint
                  .toString(16)
                  .padStart(6, "0")})`,
              }}
            />
            <div className="stage-name">{s.name}</div>
            <div className="stage-blurb">{s.blurb}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
