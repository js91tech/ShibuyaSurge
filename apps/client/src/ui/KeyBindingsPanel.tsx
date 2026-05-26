import { useEffect, useState } from "react";
import {
  ACTION_LABELS,
  DEFAULT_BINDINGS,
  keyLabel,
  loadKeyBindings,
  resetKeyBindings,
  saveKeyBindings,
  type GameAction,
  type KeyBindings,
} from "../game/keyBindings";

interface KeyBindingsPanelProps {
  onClose: () => void;
}

interface CapturingSlot {
  action: GameAction;
  slot: 0 | 1;
}

export function KeyBindingsPanel({ onClose }: KeyBindingsPanelProps) {
  const [bindings, setBindings] = useState<KeyBindings>(() => loadKeyBindings());
  const [capturing, setCapturing] = useState<CapturingSlot | null>(null);

  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Escape") {
        setCapturing(null);
        return;
      }
      setBindings((prev) => {
        const next: KeyBindings = { ...prev, [capturing.action]: [...prev[capturing.action]] };
        next[capturing.action][capturing.slot] = e.code;
        saveKeyBindings(next);
        return next;
      });
      setCapturing(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [capturing]);

  const actions = Object.keys(ACTION_LABELS) as GameAction[];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal panel keybindings-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Keyboard Bindings</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginBottom: 10 }}>
          Click a slot, then press a key. Esc to cancel.
        </p>
        <ul className="keybindings-list">
          {actions.map((action) => {
            const codes = bindings[action];
            return (
              <li key={action} className="keybinding-row">
                <span className="keybinding-label">{ACTION_LABELS[action]}</span>
                <div className="keybinding-slots">
                  {[0, 1].map((idx) => {
                    const slot = idx as 0 | 1;
                    const code = codes[slot];
                    const isCapturing = capturing?.action === action && capturing.slot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        className={`btn btn-secondary key-slot ${isCapturing ? "capturing" : ""}`}
                        onClick={() => setCapturing({ action, slot })}
                      >
                        {isCapturing ? "Press a key…" : code ? keyLabel(code) : "—"}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const fresh = resetKeyBindings();
              setBindings(fresh);
            }}
          >
            Reset to defaults
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: 8 }}>
          Defaults: {Object.entries(DEFAULT_BINDINGS)
            .map(([k, v]) => `${k}=${v.map(keyLabel).join("/")}`)
            .join("  ·  ")}
        </p>
      </div>
    </div>
  );
}
