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
            <strong>Move:</strong> <kbd>WASD</kbd> or the touch joystick
          </li>
          <li>
            <strong>Auto-attack:</strong> your techniques fire on their own — face enemies
          </li>
          <li>
            <strong>Dash:</strong> <kbd>Shift</kbd> for a short burst with brief i-frames. 3s cooldown.
          </li>
          <li>
            <strong>Domain Expansion:</strong> <kbd>Q</kbd> or the Domain button. One use per run, devastating AoE.
          </li>
          <li>
            <strong>Pickups:</strong> green hearts heal, bomb pickups clear a screen of curses.
          </li>
          <li>
            <strong>Levels:</strong> pick up XP orbs to level up and choose a technique
          </li>
          <li>
            <strong>Survive 12 minutes:</strong> a Special Grade boss spawns at the end. Reach Grade 1 or Special Grade!
          </li>
          <li>
            <strong>Pause / settings:</strong> <kbd>P</kbd> or <kbd>Esc</kbd> any time
          </li>
        </ul>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Let's exorcise
        </button>
      </div>
    </div>
  );
}
