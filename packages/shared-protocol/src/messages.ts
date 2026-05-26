export const ROOM_NAME = "shibuya_surge";

export interface JoinOptions {
  instanceId: string;
  accessToken: string;
  discordUserId: string;
  username: string;
  characterId: string;
}

export interface PlayerInput {
  seq: number;
  moveX: number;
  moveY: number;
  aimAngle: number;
  actions: number;
}

export const InputActions = {
  NONE: 0,
  DOMAIN: 1,
  REVIVE: 2,
} as const;
