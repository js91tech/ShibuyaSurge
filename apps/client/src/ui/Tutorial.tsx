interface TutorialProps {
  onClose: () => void;
}

export function Tutorial({ onClose }: TutorialProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal panel tutorial-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Welcome to Shibuya Surge</h2>
        <ul className="tutorial-list">
          <li>
            <strong>Move:</strong> <kbd>WASD</kbd> or touch anywhere on screen
          </li>
          <li>
            <strong>Auto-attack:</strong> techniques fire on their own — stay near enemies
          </li>
          <li>
            <strong>Dash:</strong> <kbd>Shift</kbd> or the Dash button — brief i-frames, ~3s cooldown
          </li>
          <li>
            <strong>Domain Expansion:</strong> <kbd>Q</kbd> or Domain button — once per run, huge AoE
          </li>
          <li>
            <strong>Level-ups:</strong> collect XP orbs, then pick one of three techniques. Use{" "}
            <strong>Reroll</strong> or <strong>Banish</strong> once per run if offered
          </li>
          <li>
            <strong>Pickups:</strong> green hearts heal, bombs clear a screen of curses
          </li>
          <li>
            <strong>Solo extras:</strong> choose a <strong>stage</strong> and up to three{" "}
            <strong>mutators</strong> before you start — your last loadout is remembered
          </li>
          <li>
            <strong>Survive 12 minutes:</strong> a Special Grade boss spawns around 3:00. Grades reward
            exorcism count
          </li>
          <li>
            <strong>Meta:</strong> earn talismans (1 per 10 exorcisms) for permanent upgrades in the shop
          </li>
          <li>
            <strong>Co-op:</strong> online runs share the arena; revive downed allies; only one Domain
            active at a time
          </li>
          <li>
            <strong>Pause / settings:</strong> <kbd>P</kbd> or <kbd>Esc</kbd> — open the Grimoire from the
            title screen for technique reference
          </li>
        </ul>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Let&apos;s exorcise
        </button>
      </div>
    </div>
  );
}
