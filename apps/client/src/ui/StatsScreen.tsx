import type { MetaProfile } from "../meta/metaApi";
import { ACHIEVEMENTS } from "../meta/achievements";
import { CHARACTER_LIST } from "@jjk/game-core";

interface StatsScreenProps {
  profile: MetaProfile | null;
  onClose: () => void;
}

export function StatsScreen({ profile, onClose }: StatsScreenProps) {
  const history = profile?.history ?? [];
  const cs = profile?.characterStats ?? {};
  const earned = new Set(profile?.achievements ?? []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal panel stats-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Career</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
          Talismans: <strong>{profile?.talismans ?? 0}</strong>
          {profile?.dailyBest != null && (
            <span> · Daily best: {profile.dailyBest}</span>
          )}
        </p>

        <h3 className="settings-section">By sorcerer</h3>
        <ul className="stats-list">
          {CHARACTER_LIST.map((c) => {
            const s = cs[c.id];
            return (
              <li key={c.id} className="stats-row">
                <strong>{c.name}</strong>
                <span>
                  {s
                    ? `${s.runs} runs · best ${s.bestExorcisms} (${s.bestGrade})`
                    : "no runs yet"}
                </span>
              </li>
            );
          })}
        </ul>

        <h3 className="settings-section">Recent runs</h3>
        {history.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>No runs yet — go exorcise something.</p>
        ) : (
          <ul className="stats-list">
            {history.slice(0, 10).map((r) => {
              const c = CHARACTER_LIST.find((x) => x.id === r.characterId);
              return (
                <li key={r.ts} className="stats-row">
                  <span>
                    {c?.name ?? r.characterId}
                    {r.mode ? ` · ${r.mode}` : ""}
                  </span>
                  <span>
                    {r.exorcismCount} · {r.grade}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <h3 className="settings-section">Achievements</h3>
        <ul className="achievement-grid">
          {ACHIEVEMENTS.map((a) => {
            const got = earned.has(a.id);
            return (
              <li key={a.id} className={`achievement-card ${got ? "earned" : "locked"}`}>
                <strong>{got ? a.label : "???"}</strong>
                <p>{got ? a.description : "Locked"}</p>
              </li>
            );
          })}
        </ul>

        <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
