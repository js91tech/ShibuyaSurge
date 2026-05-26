import { CHARACTER_LIST } from "@jjk/game-core";
import type { GameRoomState } from "@jjk/shared-protocol";
import type { DiscordSDK } from "@discord/embedded-app-sdk";
import { usePortrait } from "./usePortrait";
import { discordAvatarUrl } from "../discord/discordExtras";

function CardPortrait({ characterId }: { characterId: string }) {
  const src = usePortrait(`player_${characterId}`);
  return (
    <div className="char-card-portrait-wrap">
      <img className="char-card-portrait" src={src} alt="" draggable={false} />
    </div>
  );
}

function ChipPortrait({ characterId }: { characterId: string }) {
  const src = usePortrait(`player_${characterId}`);
  return <img className="party-portrait" src={src} alt="" draggable={false} />;
}

interface LobbyProps {
  state: GameRoomState;
  selectedCharacter: string;
  onSelectCharacter: (id: string) => void;
  onReady: (ready: boolean) => void;
  onStart: () => void;
  onInvite?: () => void;
  isHost: boolean;
  isReady: boolean;
  readyCountdown?: number;
  discordSdk?: DiscordSDK | null;
}

export function Lobby({
  state,
  selectedCharacter,
  onSelectCharacter,
  onReady,
  onStart,
  onInvite,
  isHost,
  isReady,
  readyCountdown,
  discordSdk,
}: LobbyProps) {
  const players = [...state.players.values()];

  return (
    <div className="lobby-overlay panel" style={{ margin: 16, padding: 20 }}>
      <h1 style={{ fontSize: "1.1rem", letterSpacing: "0.08em" }}>SHIBUYA SURGE</h1>
      <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
        Select your sorcerer · Ready up · Host starts the exorcism
      </p>

      {readyCountdown && readyCountdown > 0 ? (
        <div className="ready-countdown panel">
          Starting in {readyCountdown}…
        </div>
      ) : null}

      <div className="character-grid">
        {CHARACTER_LIST.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`char-card ${selectedCharacter === c.id ? "selected" : ""}`}
            onClick={() => onSelectCharacter(c.id)}
            style={{ borderLeftColor: `#${c.color.toString(16).padStart(6, "0")}` }}
          >
            <CardPortrait characterId={c.id} />
            <h3>{c.name}</h3>
            <p>{c.role}</p>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {players.map((p) => (
          <span key={p.sessionId} className="hud-plate party-chip">
            <img
              className="party-avatar"
              src={discordAvatarUrl({ id: p.discordUserId }, 32)}
              alt=""
              draggable={false}
            />
            <ChipPortrait characterId={p.characterId} />
            <span>
              {p.username} · {CHARACTER_LIST.find((c) => c.id === p.characterId)?.name ?? p.characterId}
              {p.ready ? " ✓" : ""}
            </span>
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className={`btn ${isReady ? "btn-secondary" : "btn-ready"}`}
          onClick={() => onReady(!isReady)}
        >
          {isReady ? "Unready" : "Ready"}
        </button>
        {isHost && (
          <button type="button" className="btn btn-primary" onClick={onStart}>
            Start Exorcism
          </button>
        )}
        {discordSdk && onInvite && (
          <button type="button" className="btn btn-secondary" onClick={onInvite}>
            Invite friends
          </button>
        )}
      </div>
    </div>
  );
}
