import { loadHighScore } from "../game/settings";

interface TitleScreenProps {
  onSolo: () => void;
  onDaily: () => void;
  onPractice: () => void;
  onOnline: () => void;
  onSettings: () => void;
  onShop: () => void;
  onStats: () => void;
  onTutorial: () => void;
  talismans?: number | null;
}

export function TitleScreen({
  onSolo,
  onDaily,
  onPractice,
  onOnline,
  onSettings,
  onShop,
  onStats,
  onTutorial,
  talismans,
}: TitleScreenProps) {
  const high = loadHighScore();

  return (
    <div className="title-screen">
      <div className="title-glow" />
      <h1 className="title-logo">SHIBUYA SURGE</h1>
      <p className="title-sub">Jujutsu Exorcism — Bullet Heaven</p>

      <div className="title-stats">
        {talismans != null && (
          <span className="title-talismans">{talismans} talismans</span>
        )}
        {high > 0 && <span className="title-highscore">Best: {high} exorcisms</span>}
      </div>

      <div className="title-actions">
        <button type="button" className="btn btn-primary btn-large" onClick={onSolo}>
          Play Solo
        </button>
        <button type="button" className="btn btn-secondary" onClick={onOnline}>
          Online (Discord)
        </button>
        <div className="title-actions-row">
          <button type="button" className="btn btn-secondary" onClick={onDaily}>
            Daily challenge
          </button>
          <button type="button" className="btn btn-secondary" onClick={onPractice}>
            Practice
          </button>
        </div>
        <div className="title-actions-row">
          <button type="button" className="btn btn-secondary" onClick={onShop}>
            Talisman Shop
          </button>
          <button type="button" className="btn btn-secondary" onClick={onStats}>
            Career & Stats
          </button>
        </div>
        <div className="title-actions-row">
          <button type="button" className="btn btn-ghost" onClick={onSettings}>
            Settings
          </button>
          <button type="button" className="btn btn-ghost" onClick={onTutorial}>
            How to play
          </button>
        </div>
      </div>

      <div className="title-controls panel">
        <p><kbd>WASD</kbd> move · <kbd>Shift</kbd> dash · <kbd>Q</kbd> Domain · <kbd>P</kbd> pause</p>
        <p>Touch: left joystick · Dash & Domain buttons bottom-right</p>
      </div>
    </div>
  );
}
