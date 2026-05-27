import { useEffect, useState } from "react";
import { audioManager } from "../audio/AudioManager";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type GameSettings,
} from "../game/settings";
import { KeyBindingsPanel } from "./KeyBindingsPanel";

interface SettingsPanelProps {
  onClose: () => void;
  onChange?: (s: GameSettings) => void;
  showRunOnlyToggles?: boolean;
}

export function SettingsPanel({ onClose, onChange, showRunOnlyToggles }: SettingsPanelProps) {
  const [s, setS] = useState<GameSettings>(() => loadSettings());
  const [showKeys, setShowKeys] = useState(false);

  const patch = (partial: Partial<GameSettings>) => {
    const next = { ...s, ...partial };
    setS(next);
    saveSettings(next);
    onChange?.(next);
    audioManager.applyVolumes(next.musicVolume, next.sfxVolume);
  };

  useEffect(() => {
    audioManager.applyVolumes(s.musicVolume, s.sfxVolume);
  }, [s.musicVolume, s.sfxVolume]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal panel settings-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>

        <h3 className="settings-section">Audio</h3>
        <label className="setting-row">
          <span>Music volume</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(s.musicVolume * 100)}
            onChange={(e) => patch({ musicVolume: Number(e.target.value) / 100 })}
          />
        </label>
        <label className="setting-row">
          <span>SFX volume</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(s.sfxVolume * 100)}
            onChange={(e) => patch({ sfxVolume: Number(e.target.value) / 100 })}
          />
        </label>

        <h3 className="settings-section">Visuals</h3>
        <label className="setting-row">
          <span>Particles</span>
          <select
            value={s.particles}
            onChange={(e) => patch({ particles: e.target.value as GameSettings["particles"] })}
          >
            <option value="low">Low (best FPS)</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="setting-row">
          <span>HUD scale</span>
          <input
            type="range"
            min={70}
            max={140}
            value={Math.round(s.hudScale * 100)}
            onChange={(e) => patch({ hudScale: Number(e.target.value) / 100 })}
          />
        </label>
        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={s.colorBlind}
            onChange={(e) => patch({ colorBlind: e.target.checked })}
          />
          <span>Color-blind friendly enemy tiers</span>
        </label>
        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={s.reduceMotion}
            onChange={(e) => patch({ reduceMotion: e.target.checked })}
          />
          <span>Reduce motion (less shake/flash)</span>
        </label>
        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={s.largeTouch}
            onChange={(e) => patch({ largeTouch: e.target.checked })}
          />
          <span>Larger touch targets</span>
        </label>

        <h3 className="settings-section">Gameplay</h3>
        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={s.showFps}
            onChange={(e) => patch({ showFps: e.target.checked })}
          />
          <span>Show FPS</span>
        </label>
        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={s.showTips}
            onChange={(e) => patch({ showTips: e.target.checked })}
          />
          <span>Show tips during run</span>
        </label>
        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={s.showRunStats}
            onChange={(e) => patch({ showRunStats: e.target.checked })}
          />
          <span>Show kills/min stats</span>
        </label>
        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={s.autoPickUpgrade}
            onChange={(e) => patch({ autoPickUpgrade: e.target.checked })}
          />
          <span>Auto-pick upgrades on level-up</span>
        </label>
        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={s.smartAutoPick}
            onChange={(e) => patch({ smartAutoPick: e.target.checked })}
            disabled={!s.autoPickUpgrade}
          />
          <span>Smart auto-pick (prefer upgrades & synergies)</span>
        </label>
        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={s.skipSoloLobby}
            onChange={(e) => patch({ skipSoloLobby: e.target.checked })}
          />
          <span>Skip solo lobby (auto-start with last character)</span>
        </label>
        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={s.practiceMode}
            onChange={(e) => patch({ practiceMode: e.target.checked })}
          />
          <span>Practice mode (solo: no timer, no death — no rewards)</span>
        </label>
        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={s.pauseOnHidden}
            onChange={(e) => patch({ pauseOnHidden: e.target.checked })}
          />
          <span>Pause solo when tab hidden</span>
        </label>
        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={s.hapticsOn}
            onChange={(e) => patch({ hapticsOn: e.target.checked })}
          />
          <span>Haptics / vibration on mobile</span>
        </label>

        <h3 className="settings-section">Controls</h3>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: "100%" }}
          onClick={() => setShowKeys(true)}
        >
          Configure keyboard…
        </button>

        {showRunOnlyToggles && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: 8 }}>
            Some changes apply on your next run.
          </p>
        )}

        {showKeys && <KeyBindingsPanel onClose={() => setShowKeys(false)} />}

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const reset = { ...DEFAULT_SETTINGS, tutorialSeen: s.tutorialSeen };
              setS(reset);
              saveSettings(reset);
              onChange?.(reset);
              audioManager.applyVolumes(reset.musicVolume, reset.sfxVolume);
            }}
          >
            Reset defaults
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
