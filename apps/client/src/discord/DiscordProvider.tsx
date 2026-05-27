import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DiscordSDK, Events } from "@discord/embedded-app-sdk";

export interface DiscordUser {
  id: string;
  username: string;
  globalName?: string;
  avatar?: string | null;
}

interface DiscordContextValue {
  discordSdk: DiscordSDK | null;
  ready: boolean;
  authenticated: boolean;
  accessToken: string | null;
  instanceId: string | null;
  user: DiscordUser | null;
  participants: DiscordUser[];
  thermalLevel: string;
  error: string | null;
  isDiscord: boolean;
}

const DiscordContext = createContext<DiscordContextValue | null>(null);

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID ?? "";

/**
 * Discord injects `frame_id` (and a few other) query params into the activity
 * iframe URL when it boots us. If they're not present we're definitely not in
 * a Discord Activity context — so we MUST NOT call `new DiscordSDK(...)` here
 * because its constructor reads `frame_id` and throws synchronously if it's
 * missing, which crashed the whole React tree before the error boundary went
 * in. The check is a cheap URL parse so we can run it module-load-safe.
 */
function isInsideDiscordActivity(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("frame_id")) return true;
    if (window.location.host.endsWith("discordsays.com")) return true;
    return false;
  } catch {
    return false;
  }
}

function mockDiscord(): DiscordContextValue {
  return {
    discordSdk: null,
    ready: true,
    authenticated: true,
    accessToken: "dev-token",
    instanceId: "dev-instance",
    user: { id: "dev-user", username: "DevSorcerer" },
    participants: [{ id: "dev-user", username: "DevSorcerer" }],
    thermalLevel: "nominal",
    error: null,
    isDiscord: false,
  };
}

export function DiscordProvider({ children }: { children: ReactNode }) {
  const insideActivity =
    !!CLIENT_ID && CLIENT_ID !== "your_client_id_here" && isInsideDiscordActivity();

  const [value, setValue] = useState<DiscordContextValue>(
    insideActivity
      ? {
          discordSdk: null,
          ready: false,
          authenticated: false,
          accessToken: null,
          instanceId: null,
          user: null,
          participants: [],
          thermalLevel: "nominal",
          error: null,
          isDiscord: true,
        }
      : mockDiscord()
  );

  useEffect(() => {
    // `insideActivity` is a render-stable boolean (URL doesn't change at
    // runtime), so this effect is effectively mount-only. Re-checking here
    // keeps the deps empty without a lint suppression.
    if (!isInsideDiscordActivity() || !CLIENT_ID || CLIENT_ID === "your_client_id_here") {
      return;
    }

    let discordSdk: DiscordSDK;
    try {
      discordSdk = new DiscordSDK(CLIENT_ID);
    } catch (err) {
      // Constructor reads `frame_id` and throws if it's missing. We already
      // gate with isInsideDiscordActivity(), but keep this belt-and-braces so
      // the React tree never unmounts because of an SDK init throw.
      console.warn("[discord] SDK constructor failed, using dev mode", err);
      setValue(mockDiscord());
      return;
    }

    let mounted = true;

    async function init() {
      try {
        await discordSdk.ready();

        const { code } = await discordSdk.commands.authorize({
          client_id: CLIENT_ID,
          response_type: "code",
          state: "",
          prompt: "none",
          scope: [
            "identify",
            "rpc.activities.write",
            "rpc.voice.read",
          ],
        });

        const tokenRes = await fetch("/.proxy/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        let tokenData: { access_token?: string };
        if (!tokenRes.ok) {
          const fallback = await fetch("/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });
          if (!fallback.ok) throw new Error("Token exchange failed");
          tokenData = await fallback.json();
        } else {
          tokenData = await tokenRes.json();
        }

        const access_token = tokenData.access_token;
        if (!access_token) throw new Error("No access token");
        const auth = await discordSdk.commands.authenticate({ access_token });

        const user = auth.user
          ? {
              id: auth.user.id,
              username: auth.user.username,
              globalName: auth.user.global_name ?? undefined,
              avatar: auth.user.avatar,
            }
          : null;

        try {
          await discordSdk.commands.setOrientationLockState({
            lock_state: 3,
            picture_in_picture_lock_state: 3,
            grid_lock_state: 2,
          });
        } catch {
          /* optional on desktop */
        }

        discordSdk.subscribe(Events.THERMAL_STATE_UPDATE, (data) => {
          const map: Record<number, string> = {
            0: "nominal",
            1: "light",
            2: "moderate",
            3: "serious",
            4: "critical",
          };
          const level = map[(data as { thermal_state: number }).thermal_state] ?? "nominal";
          if (mounted) {
            setValue((v) => ({ ...v, thermalLevel: level }));
          }
        });

        const instanceId = discordSdk.instanceId;

        if (mounted) {
          setValue({
            discordSdk,
            ready: true,
            authenticated: true,
            accessToken: access_token,
            instanceId,
            user,
            participants: user ? [user] : [],
            thermalLevel: "nominal",
            error: null,
            isDiscord: true,
          });
        }

        try {
          await discordSdk.commands.setActivity({
            activity: {
              type: 0,
              details: "Shibuya Surge — Lobby",
              state: "Selecting sorcerer",
              timestamps: { start: Math.floor(Date.now() / 1000) },
              party: {
                id: instanceId,
                size: [1, 4],
              },
            },
          });
        } catch {
          /* rich presence optional */
        }
      } catch (err) {
        console.warn("[discord] init failed, using dev mode", err);
        if (mounted) setValue(mockDiscord());
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <DiscordContext.Provider value={value}>{children}</DiscordContext.Provider>
  );
}

export function useDiscord() {
  const ctx = useContext(DiscordContext);
  if (!ctx) throw new Error("useDiscord outside provider");
  return ctx;
}
