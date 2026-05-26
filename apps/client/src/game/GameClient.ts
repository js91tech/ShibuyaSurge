import * as Colyseus from "colyseus.js";
import { ROOM_NAME, type JoinOptions, type PlayerInput } from "@jjk/shared-protocol";
import type { GameRoomState } from "@jjk/shared-protocol";

const GAME_SERVER =
  import.meta.env.VITE_GAME_SERVER_URL ?? "ws://localhost:3001";

export type GameRoom = Colyseus.Room<GameRoomState>;

export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "lost";

export class GameClient {
  client = new Colyseus.Client(GAME_SERVER);
  room: GameRoom | null = null;
  hostSessionId: string | null = null;
  inputSeq = 0;
  pingMs = 0;
  private lastJoin: JoinOptions | null = null;
  private connState: ConnectionState = "idle";
  private stateListeners = new Set<(s: ConnectionState) => void>();
  private pingHandle: ReturnType<typeof setInterval> | null = null;
  private pingSent = 0;
  private reconnectAttempt = 0;
  private deliberateLeave = false;

  onConnectionState(fn: (s: ConnectionState) => void): () => void {
    this.stateListeners.add(fn);
    fn(this.connState);
    return () => this.stateListeners.delete(fn);
  }

  private setState(s: ConnectionState) {
    if (this.connState === s) return;
    this.connState = s;
    for (const fn of this.stateListeners) fn(s);
  }

  async join(options: JoinOptions): Promise<GameRoom> {
    this.deliberateLeave = false;
    this.lastJoin = options;
    this.setState("connecting");
    this.room = await this.client.joinOrCreate<GameRoomState>(ROOM_NAME, options);
    this.bindRoom(this.room);
    this.setState("connected");
    this.reconnectAttempt = 0;
    return this.room;
  }

  private bindRoom(room: GameRoom) {
    room.onMessage("joined", (data: { sessionId: string; host: string }) => {
      this.hostSessionId = data.host;
    });
    room.onMessage("pong", () => {
      this.pingMs = performance.now() - this.pingSent;
    });

    if (this.pingHandle) clearInterval(this.pingHandle);
    this.pingHandle = setInterval(() => {
      if (!this.room) return;
      this.pingSent = performance.now();
      try {
        this.room.send("ping", { t: this.pingSent });
      } catch {
        /* ignore — onLeave will fire */
      }
    }, 4000);

    room.onLeave((code) => {
      if (this.pingHandle) {
        clearInterval(this.pingHandle);
        this.pingHandle = null;
      }
      if (this.deliberateLeave) {
        this.setState("idle");
        return;
      }
      const recoverable = code !== 4000;
      if (recoverable && this.lastJoin) {
        void this.attemptReconnect();
      } else {
        this.setState("lost");
      }
    });
  }

  private async attemptReconnect(): Promise<void> {
    if (!this.lastJoin || this.deliberateLeave) return;
    this.setState("reconnecting");
    while (!this.deliberateLeave && this.reconnectAttempt < 4) {
      this.reconnectAttempt++;
      const delay = Math.min(4000, 600 * this.reconnectAttempt);
      await new Promise((r) => setTimeout(r, delay));
      try {
        this.room = await this.client.joinOrCreate<GameRoomState>(ROOM_NAME, this.lastJoin);
        this.bindRoom(this.room);
        this.setState("connected");
        this.reconnectAttempt = 0;
        return;
      } catch (err) {
        console.warn("[game] reconnect attempt failed", this.reconnectAttempt, err);
      }
    }
    this.setState("lost");
  }

  /** Current Colyseus room state (null if not joined) */
  get state(): GameRoomState | null {
    return this.room?.state ?? null;
  }

  get sessionId() {
    return this.room?.sessionId ?? null;
  }

  isHost() {
    return this.sessionId === this.hostSessionId;
  }

  sendReady(ready: boolean) {
    this.room?.send("ready", { ready });
  }

  sendCharacter(characterId: string) {
    this.room?.send("select_character", { characterId });
  }

  startRun() {
    this.room?.send("start_run", {});
  }

  sendInput(input: Omit<PlayerInput, "seq">) {
    const payload: PlayerInput = { ...input, seq: ++this.inputSeq };
    this.room?.send("input", payload);
  }

  pickUpgrade(techniqueId: string) {
    this.room?.send("pick_upgrade", { techniqueId });
  }

  rerollDraft() {
    this.room?.send("draft_reroll", {});
  }

  banishDraft(techniqueId: string) {
    this.room?.send("draft_banish", { techniqueId });
  }

  sendPing(x: number, y: number, tag: string) {
    this.room?.send("co_ping", { x, y, tag });
  }

  leave() {
    this.deliberateLeave = true;
    if (this.pingHandle) {
      clearInterval(this.pingHandle);
      this.pingHandle = null;
    }
    try { this.room?.leave(); } catch { /* ignore */ }
    this.room = null;
    this.setState("idle");
  }
}

export const gameClient = new GameClient();
