var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";
export class TechniqueSlot extends Schema {
    id = "";
    level = 1;
}
__decorate([
    type("string")
], TechniqueSlot.prototype, "id", void 0);
__decorate([
    type("number")
], TechniqueSlot.prototype, "level", void 0);
export class PlayerState extends Schema {
    sessionId = "";
    discordUserId = "";
    username = "";
    characterId = "yuji";
    x = 0;
    y = 0;
    hp = 100;
    maxHp = 100;
    xp = 0;
    level = 1;
    ready = false;
    downed = false;
    downCount = 0;
    spectating = false;
    moveX = 0;
    moveY = 0;
    aimAngle = 0;
    domainUsed = false;
    domainActive = false;
    /** 0–5s revive channel while a teammate is in range */
    reviveProgress = 0;
    techniques = new ArraySchema();
    choosingUpgrade = false;
}
__decorate([
    type("string")
], PlayerState.prototype, "sessionId", void 0);
__decorate([
    type("string")
], PlayerState.prototype, "discordUserId", void 0);
__decorate([
    type("string")
], PlayerState.prototype, "username", void 0);
__decorate([
    type("string")
], PlayerState.prototype, "characterId", void 0);
__decorate([
    type("number")
], PlayerState.prototype, "x", void 0);
__decorate([
    type("number")
], PlayerState.prototype, "y", void 0);
__decorate([
    type("number")
], PlayerState.prototype, "hp", void 0);
__decorate([
    type("number")
], PlayerState.prototype, "maxHp", void 0);
__decorate([
    type("number")
], PlayerState.prototype, "xp", void 0);
__decorate([
    type("number")
], PlayerState.prototype, "level", void 0);
__decorate([
    type("boolean")
], PlayerState.prototype, "ready", void 0);
__decorate([
    type("boolean")
], PlayerState.prototype, "downed", void 0);
__decorate([
    type("number")
], PlayerState.prototype, "downCount", void 0);
__decorate([
    type("boolean")
], PlayerState.prototype, "spectating", void 0);
__decorate([
    type("number")
], PlayerState.prototype, "moveX", void 0);
__decorate([
    type("number")
], PlayerState.prototype, "moveY", void 0);
__decorate([
    type("number")
], PlayerState.prototype, "aimAngle", void 0);
__decorate([
    type("boolean")
], PlayerState.prototype, "domainUsed", void 0);
__decorate([
    type("boolean")
], PlayerState.prototype, "domainActive", void 0);
__decorate([
    type("number")
], PlayerState.prototype, "reviveProgress", void 0);
__decorate([
    type([TechniqueSlot])
], PlayerState.prototype, "techniques", void 0);
__decorate([
    type("boolean")
], PlayerState.prototype, "choosingUpgrade", void 0);
export class EnemyState extends Schema {
    id = "";
    typeId = "flyer";
    x = 0;
    y = 0;
    hp = 10;
    maxHp = 10;
    elite = false;
    boss = false;
}
__decorate([
    type("string")
], EnemyState.prototype, "id", void 0);
__decorate([
    type("string")
], EnemyState.prototype, "typeId", void 0);
__decorate([
    type("number")
], EnemyState.prototype, "x", void 0);
__decorate([
    type("number")
], EnemyState.prototype, "y", void 0);
__decorate([
    type("number")
], EnemyState.prototype, "hp", void 0);
__decorate([
    type("number")
], EnemyState.prototype, "maxHp", void 0);
__decorate([
    type("boolean")
], EnemyState.prototype, "elite", void 0);
__decorate([
    type("boolean")
], EnemyState.prototype, "boss", void 0);
export class PickupState extends Schema {
    id = "";
    x = 0;
    y = 0;
    value = 1;
}
__decorate([
    type("string")
], PickupState.prototype, "id", void 0);
__decorate([
    type("number")
], PickupState.prototype, "x", void 0);
__decorate([
    type("number")
], PickupState.prototype, "y", void 0);
__decorate([
    type("number")
], PickupState.prototype, "value", void 0);
export class GameRoomState extends Schema {
    phase = "lobby";
    instanceId = "";
    elapsed = 0;
    wave = 1;
    bossSpawned = false;
    bossHp = 0;
    bossMaxHp = 0;
    bossPhase = 1;
    runEnded = false;
    grade = "";
    exorcismCount = 0;
    players = new MapSchema();
    enemies = new ArraySchema();
    pickups = new ArraySchema();
    draftOptions = new ArraySchema();
    draftingPlayerId = "";
    cameraX = 0;
    cameraY = 0;
    cameraZoom = 1;
    timeScale = 1;
    /** Session id of sorcerer with an active domain (empty if none) */
    domainOwnerSessionId = "";
}
__decorate([
    type("string")
], GameRoomState.prototype, "phase", void 0);
__decorate([
    type("string")
], GameRoomState.prototype, "instanceId", void 0);
__decorate([
    type("number")
], GameRoomState.prototype, "elapsed", void 0);
__decorate([
    type("number")
], GameRoomState.prototype, "wave", void 0);
__decorate([
    type("boolean")
], GameRoomState.prototype, "bossSpawned", void 0);
__decorate([
    type("number")
], GameRoomState.prototype, "bossHp", void 0);
__decorate([
    type("number")
], GameRoomState.prototype, "bossMaxHp", void 0);
__decorate([
    type("number")
], GameRoomState.prototype, "bossPhase", void 0);
__decorate([
    type("boolean")
], GameRoomState.prototype, "runEnded", void 0);
__decorate([
    type("string")
], GameRoomState.prototype, "grade", void 0);
__decorate([
    type("number")
], GameRoomState.prototype, "exorcismCount", void 0);
__decorate([
    type({ map: PlayerState })
], GameRoomState.prototype, "players", void 0);
__decorate([
    type([EnemyState])
], GameRoomState.prototype, "enemies", void 0);
__decorate([
    type([PickupState])
], GameRoomState.prototype, "pickups", void 0);
__decorate([
    type(["string"])
], GameRoomState.prototype, "draftOptions", void 0);
__decorate([
    type("string")
], GameRoomState.prototype, "draftingPlayerId", void 0);
__decorate([
    type("number")
], GameRoomState.prototype, "cameraX", void 0);
__decorate([
    type("number")
], GameRoomState.prototype, "cameraY", void 0);
__decorate([
    type("number")
], GameRoomState.prototype, "cameraZoom", void 0);
__decorate([
    type("number")
], GameRoomState.prototype, "timeScale", void 0);
__decorate([
    type("string")
], GameRoomState.prototype, "domainOwnerSessionId", void 0);
