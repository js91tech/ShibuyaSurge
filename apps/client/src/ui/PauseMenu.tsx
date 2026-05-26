import { keyLabel, loadKeyBindings, ACTION_LABELS, type GameAction } from "../game/keyBindings";

interface PauseMenuProps {
  onResume: () => void;
  onQuit: () => void;
  onSettings: () => void;
}

const SHEET_ORDER: GameAction[] = [
  "up",
  "down",
  "left",
  "right",
  "dash",
  "domain",
  "pause",
  "ping",
];

export function PauseMenu({ onResume, onQuit, onSettings }: PauseMenuProps) {
  const bindings = loadKeyBindings();
  return (
    <div className="draft-overlay">
      <div className="modal panel" style={{ pointerEvents: "auto", maxWidth: 380 }}>
        <h2>Paused</h2>
        <div className="pause-cheatsheet">
          <div className="pause-cheatsheet-title">Controls</div>
          {SHEET_ORDER.map((action) => (
            <div key={action} className="pause-cheatsheet-row">
              <span>{ACTION_LABELS[action]}</span>
              <span className="pause-cheatsheet-keys">
                {bindings[action]?.map((c, i) => (
                  <kbd key={`${action}-${c}-${i}`}>{keyLabel(c)}</kbd>
                ))}
              </span>
            </div>
          ))}
          <div className="pause-cheatsheet-row">
            <span>Toggle mute</span>
            <span className="pause-cheatsheet-keys">
              <kbd>M</kbd>
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          <button type="button" className="btn btn-primary" onClick={onResume}>
            Resume
          </button>
          <button type="button" className="btn btn-secondary" onClick={onSettings}>
            Settings
          </button>
          <button type="button" className="btn btn-secondary" onClick={onQuit}>
            Quit to menu
          </button>
        </div>
      </div>
    </div>
  );
}
