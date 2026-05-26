import { useEffect, useMemo } from "react";
import { useDiscord } from "../discord/DiscordProvider";
import { buildMetaUserId, setMetaAccessToken } from "./metaApi";

/**
 * Resolve the meta user id for the current Discord session.
 *
 * Returns `discord:<id>` once the embedded SDK finishes auth and exposes a
 * real user (`isDiscord && user.id !== "dev-user"`), otherwise `local:<uuid>`.
 *
 * Also pushes the current access token into the metaApi singleton so saved
 * runs include `Authorization: Bearer …` when available.
 */
export function useMetaUserId(): { userId: string; ready: boolean } {
  const discord = useDiscord();

  const userId = useMemo(
    () =>
      buildMetaUserId({
        isDiscord: discord.isDiscord && discord.ready && discord.authenticated,
        discordUserId: discord.user?.id ?? null,
      }),
    [discord.isDiscord, discord.ready, discord.authenticated, discord.user?.id]
  );

  useEffect(() => {
    setMetaAccessToken(discord.accessToken ?? null);
    return () => {
      setMetaAccessToken(null);
    };
  }, [discord.accessToken]);

  return { userId, ready: discord.ready };
}
