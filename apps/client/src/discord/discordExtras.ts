import type { DiscordSDK } from "@discord/embedded-app-sdk";
import type { DiscordUser } from "./DiscordProvider";

/** Discord CDN avatar URL builder (defaults if no avatar) */
export function discordAvatarUrl(
  user: { id: string; avatar?: string | null } | null | undefined,
  size = 64
): string {
  if (!user) return defaultAvatar(0, size);
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;
  }
  const idx = Number(BigInt(user.id) % 6n);
  return defaultAvatar(idx, size);
}

function defaultAvatar(index: number, size: number) {
  return `https://cdn.discordapp.com/embed/avatars/${index}.png?size=${size}`;
}

/** Build rich-presence activity from current game phase */
export async function updateActivity(
  sdk: DiscordSDK | null,
  args: {
    phase: "lobby" | "run" | "results" | "menu";
    instanceId?: string | null;
    characterName?: string;
    wave?: number;
    remainingSec?: number;
    partySize?: number;
    bossSpawned?: boolean;
  }
): Promise<void> {
  if (!sdk) return;
  try {
    const detailsByPhase: Record<string, string> = {
      lobby: "Selecting sorcerer",
      run: args.bossSpawned ? "Special Grade fight" : "Exorcising in Shibuya",
      results: "Run complete",
      menu: "In menus",
    };
    const stateBits: string[] = [];
    if (args.characterName) stateBits.push(args.characterName);
    if (args.wave) stateBits.push(`Wave ${args.wave}`);
    if (args.remainingSec != null) {
      const m = Math.floor(args.remainingSec / 60);
      const s = (args.remainingSec % 60).toString().padStart(2, "0");
      stateBits.push(`${m}:${s} left`);
    }

    await sdk.commands.setActivity({
      activity: {
        type: 0,
        details: detailsByPhase[args.phase] ?? "Shibuya Surge",
        state: stateBits.join(" · ") || "Jujutsu Exorcism",
        timestamps: { start: Math.floor(Date.now() / 1000) },
        party: args.instanceId
          ? { id: args.instanceId, size: [Math.max(1, args.partySize ?? 1), 4] }
          : undefined,
      },
    });
  } catch (err) {
    console.warn("[discord] setActivity failed", err);
  }
}

/** Open Discord's invite-others-to-this-activity dialog */
export async function openInvite(sdk: DiscordSDK | null): Promise<boolean> {
  if (!sdk) return false;
  try {
    await sdk.commands.openInviteDialog();
    return true;
  } catch (err) {
    console.warn("[discord] openInviteDialog failed", err);
    return false;
  }
}

/** Best-effort haptic — Discord SDK only on supported devices, else navigator.vibrate */
export function haptic(strength: "light" | "medium" | "heavy" = "light") {
  const ms = strength === "heavy" ? 60 : strength === "medium" ? 25 : 10;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* ignore */
    }
  }
}

export type { DiscordUser };
