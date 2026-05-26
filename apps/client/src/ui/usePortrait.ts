import { useEffect, useState } from "react";
import { getPortrait, subscribePortraits } from "../game/portraitCache";

/** Returns a transparent + trimmed data URL for a sprite key (e.g. "player_yuji").
 *  Falls back to the raw URL on the first synchronous render, then re-renders when the cleaned version is ready. */
export function usePortrait(key: string): string {
  const [, tick] = useState(0);
  useEffect(() => subscribePortraits(() => tick((n) => n + 1)), []);
  return getPortrait(key);
}
