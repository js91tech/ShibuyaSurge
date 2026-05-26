import type { NextFunction, Request, Response } from "express";

interface CacheEntry {
  userId: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const tokenCache = new Map<string, CacheEntry>();

function extractBearer(req: Request): string | null {
  const header = req.header("authorization") ?? req.header("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

async function discordUserIdForToken(accessToken: string): Promise<string | null> {
  const cached = tokenCache.get(accessToken);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.userId;
  }
  if (cached) tokenCache.delete(accessToken);

  try {
    const res = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { id?: string };
    if (!data.id) return null;
    tokenCache.set(accessToken, {
      userId: data.id,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return data.id;
  } catch (err) {
    console.warn("[discordAuth] users/@me failed", err);
    return null;
  }
}

/**
 * Express middleware that verifies a Discord OAuth access token against the
 * `:userId` path parameter when the id is namespaced `discord:<id>`. For
 * `local:<uuid>` ids (the dev fallback) the request is allowed through with no
 * token check so the JSON store keeps working in local dev.
 *
 * Disabled entirely when `SKIP_INSTANCE_VERIFY=true` (matches the existing
 * Colyseus escape hatch).
 */
export function discordAuthForUserParam(paramName = "userId") {
  return async function discordAuth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (process.env.SKIP_INSTANCE_VERIFY === "true") {
      next();
      return;
    }

    const param = req.params[paramName];
    const rawId = typeof param === "string" ? param : "";
    if (!rawId) {
      next();
      return;
    }

    if (rawId.startsWith("local:")) {
      next();
      return;
    }

    if (!rawId.startsWith("discord:")) {
      // Legacy un-namespaced ids — treat the same as local (no token check).
      // The client now writes namespaced ids; this branch only fires for old
      // clients during the rollout window.
      next();
      return;
    }

    const claimedDiscordId = rawId.slice("discord:".length);
    const token = extractBearer(req);
    if (!token) {
      res.status(401).json({ error: "Missing Authorization: Bearer <token>" });
      return;
    }
    // Local-dev / mock token from the client's mockDiscord() context — only
    // accept this when verify is explicitly skipped above, otherwise reject.
    if (token === "dev-token") {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const realId = await discordUserIdForToken(token);
    if (!realId) {
      res.status(401).json({ error: "Invalid Discord token" });
      return;
    }

    if (realId !== claimedDiscordId) {
      res.status(403).json({ error: "Token does not match path user id" });
      return;
    }

    next();
  };
}

/** Test/cleanup hook. */
export function _clearDiscordAuthCache() {
  tokenCache.clear();
}
