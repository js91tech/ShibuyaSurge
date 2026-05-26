import { CHARACTER_LIST } from "@jjk/game-core";
import type { GameRoomState } from "@jjk/shared-protocol";

interface DomainIndicatorProps {
  state: GameRoomState;
  sessionId: string | null;
}

export function DomainIndicator({ state, sessionId }: DomainIndicatorProps) {
  if (state.phase !== "run") return null;

  const ownerId = state.domainOwnerSessionId;
  const anyDomain = [...state.players.values()].some((p) => p.domainActive);
  const me = sessionId ? state.players.get(sessionId) : null;

  if (!anyDomain && me && !me.domainUsed) {
    return (
      <div className="domain-indicator panel ready">
        Domain ready
      </div>
    );
  }

  if (anyDomain && ownerId) {
    const owner = state.players.get(ownerId);
    const name =
      CHARACTER_LIST.find((c) => c.id === owner?.characterId)?.name ?? owner?.username ?? "Sorcerer";
    const isMe = ownerId === sessionId;
    return (
      <div className={`domain-indicator panel active ${isMe ? "self" : ""}`}>
        {isMe ? "Your" : `${name}'s`} Domain Expansion
      </div>
    );
  }

  if (me?.domainUsed && !me.domainActive) {
    return <div className="domain-indicator panel spent">Domain spent</div>;
  }

  const blocked = [...state.players.values()].some((p) => p.domainActive);
  if (me && !me.domainUsed && blocked) {
    return <div className="domain-indicator panel blocked">Domain in use — one at a time</div>;
  }

  return null;
}
