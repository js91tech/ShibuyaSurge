import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";

export class TechniqueSlot extends Schema {
  @type("string") id: string = "";
  @type("number") level: number = 1;
}

export class PlayerState extends Schema {
  @type("string") sessionId: string = "";
  @type("string") discordUserId: string = "";
  @type("string") username: string = "";
  @type("string") characterId: string = "yuji";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") hp: number = 100;
  @type("number") maxHp: number = 100;
  @type("number") xp: number = 0;
  @type("number") level: number = 1;
  @type("boolean") ready: boolean = false;
  @type("boolean") downed: boolean = false;
  @type("number") downCount: number = 0;
  @type("boolean") spectating: boolean = false;
  @type("number") moveX: number = 0;
  @type("number") moveY: number = 0;
  @type("number") aimAngle: number = 0;
  @type("boolean") domainUsed: boolean = false;
  @type("boolean") domainActive: boolean = false;
  /** 0–5s revive channel while a teammate is in range */
  @type("number") reviveProgress: number = 0;
  @type([TechniqueSlot]) techniques = new ArraySchema<TechniqueSlot>();
  @type("boolean") choosingUpgrade: boolean = false;
}

export class EnemyState extends Schema {
  @type("string") id: string = "";
  @type("string") typeId: string = "flyer";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") hp: number = 10;
  @type("number") maxHp: number = 10;
  @type("boolean") elite: boolean = false;
  @type("boolean") boss: boolean = false;
}

export class PickupState extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") value: number = 1;
}

export class GameRoomState extends Schema {
  @type("string") phase: string = "lobby";
  @type("string") instanceId: string = "";
  @type("number") elapsed: number = 0;
  @type("number") wave: number = 1;
  @type("boolean") bossSpawned: boolean = false;
  @type("number") bossHp: number = 0;
  @type("number") bossMaxHp: number = 0;
  @type("number") bossPhase: number = 1;
  @type("boolean") runEnded: boolean = false;
  @type("string") grade: string = "";
  @type("number") exorcismCount: number = 0;
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type([EnemyState]) enemies = new ArraySchema<EnemyState>();
  @type([PickupState]) pickups = new ArraySchema<PickupState>();
  @type(["string"]) draftOptions = new ArraySchema<string>();
  @type("string") draftingPlayerId: string = "";
  @type("number") cameraX: number = 0;
  @type("number") cameraY: number = 0;
  @type("number") cameraZoom: number = 1;
  @type("number") timeScale: number = 1;
  /** Session id of sorcerer with an active domain (empty if none) */
  @type("string") domainOwnerSessionId: string = "";
}
