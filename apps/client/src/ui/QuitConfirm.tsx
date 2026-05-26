interface QuitConfirmProps {
  exorcismCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function QuitConfirm({ exorcismCount, onCancel, onConfirm }: QuitConfirmProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal panel" onClick={(e) => e.stopPropagation()}>
        <h2>End the run?</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 14 }}>
          You've exorcised <strong>{exorcismCount}</strong> spirits. Talismans earned
          (+{Math.floor(exorcismCount / 10)}) will still be saved.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Keep playing
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            End run
          </button>
        </div>
      </div>
    </div>
  );
}
