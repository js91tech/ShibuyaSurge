/** Minimal pub/sub bus for in-game UI events (toasts, achievements, pings, telegraphs) */

export type GameEvent =
  | { kind: "boss_spawn"; phase?: number; label?: string }
  | { kind: "boss_phase2" }
  | { kind: "boss_telegraph"; x: number; y: number; durationMs: number; label?: string }
  | { kind: "boss_defeated" }
  | { kind: "level_up"; level: number }
  | { kind: "downed"; username: string }
  | { kind: "revived"; username: string }
  | { kind: "domain"; username: string }
  | { kind: "achievement"; id: string; label: string }
  | { kind: "ping"; username: string; x: number; y: number; tag: PingTag }
  | { kind: "info"; message: string }
  | { kind: "streak"; multiplier: number; kills: number }
  | { kind: "xp_gain"; x: number; y: number; amount: number }
  | { kind: "health_pickup"; x: number; y: number; amount: number }
  | { kind: "dash"; x: number; y: number; angle: number }
  | { kind: "ultimate"; character: string };

export type PingTag = "here" | "help" | "regroup" | "boss";

type Listener = (e: GameEvent) => void;

class EventBus {
  private listeners = new Set<Listener>();

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(e: GameEvent) {
    for (const fn of this.listeners) {
      try {
        fn(e);
      } catch (err) {
        console.warn("[eventBus] listener threw", err);
      }
    }
  }
}

export const eventBus = new EventBus();
