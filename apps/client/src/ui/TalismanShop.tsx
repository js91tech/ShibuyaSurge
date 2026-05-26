import type { MetaProfile } from "../meta/metaApi";
import { UNLOCKS } from "../meta/unlocks";

interface TalismanShopProps {
  profile: MetaProfile | null;
  onClose: () => void;
  onPurchase?: (unlockId: string, cost: number) => Promise<boolean>;
}

export function TalismanShop({ profile, onClose, onPurchase }: TalismanShopProps) {
  const balance = profile?.talismans ?? 0;
  const owned = new Set(profile?.unlocks ?? []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal panel shop-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Cursed Talisman Shop</h2>
        <p className="shop-balance">
          Balance: <strong>{balance}</strong> talismans
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: 12 }}>
          Earn talismans from runs (1 per 10 exorcisms). Purchases apply to all future runs.
        </p>
        <ul className="shop-list">
          {UNLOCKS.map((item) => {
            const has = owned.has(item.id);
            const canBuy = balance >= item.cost && !has;
            return (
              <li key={item.id} className="shop-item panel">
                <div className="shop-item-info">
                  <strong>{item.name}</strong>
                  <p className="shop-desc">{item.description}</p>
                  <span className="shop-cost">{item.cost} ◈</span>
                </div>
                <button
                  type="button"
                  className={`btn ${has ? "btn-ghost" : "btn-primary"}`}
                  disabled={!canBuy}
                  onClick={async () => {
                    if (!onPurchase || !canBuy) return;
                    await onPurchase(item.id, item.cost);
                  }}
                >
                  {has ? "Owned" : canBuy ? "Buy" : "Locked"}
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className="btn btn-secondary" style={{ marginTop: 12 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
