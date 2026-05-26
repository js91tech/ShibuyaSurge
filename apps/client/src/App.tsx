import { useEffect, useState } from "react";
import { TitleScreen } from "./ui/TitleScreen";
import { SettingsPanel } from "./ui/SettingsPanel";
import { TalismanShop } from "./ui/TalismanShop";
import { StatsScreen } from "./ui/StatsScreen";
import { Tutorial } from "./ui/Tutorial";
import { ToastFeed } from "./ui/ToastFeed";
import { SoloApp } from "./SoloApp";
import { OnlineApp } from "./OnlineApp";
import { useMetaUserId } from "./meta/useMetaUserId";
import { useMeta } from "./meta/useMeta";
import { loadSettings, saveSettings } from "./game/settings";

type Screen = "title" | "solo" | "online" | "settings" | "shop" | "stats";
type SoloMode = "normal" | "daily" | "practice";

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [soloMode, setSoloMode] = useState<SoloMode>("normal");
  const [showTutorial, setShowTutorial] = useState(false);
  // userId flips from `local:<uuid>` → `discord:<id>` once the embedded SDK
  // finishes auth. useMeta re-fetches on this change, so the saved profile
  // loads as soon as we know who the player is in Discord.
  const { userId } = useMetaUserId();
  const { profile, purchase, recordRun, refresh } = useMeta(userId);

  useEffect(() => {
    const s = loadSettings();
    if (!s.tutorialSeen) setShowTutorial(true);
  }, []);

  // Global tap ripple for any `.btn` — flips `data-tap` for ~250ms so the CSS
  // pseudo-element animates. Delegated so we don't need refs on every button.
  useEffect(() => {
    const fire = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest(".btn") as HTMLElement | null;
      if (!btn || btn.hasAttribute("disabled")) return;
      btn.setAttribute("data-tap", "1");
      window.setTimeout(() => btn.removeAttribute("data-tap"), 260);
    };
    const onPointer = (e: PointerEvent) => fire(e.target);
    document.addEventListener("pointerdown", onPointer, { passive: true });
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  const onTutorialClose = () => {
    setShowTutorial(false);
    saveSettings({ ...loadSettings(), tutorialSeen: true });
  };

  if (screen === "solo") {
    return (
      <>
        <SoloApp
          onBack={() => {
            setScreen("title");
            void refresh();
          }}
          mode={soloMode}
          profile={profile}
          recordRun={recordRun}
        />
        <ToastFeed />
      </>
    );
  }

  if (screen === "online") {
    return (
      <>
        <OnlineApp
          onBack={() => {
            setScreen("title");
            void refresh();
          }}
        />
        <ToastFeed />
      </>
    );
  }

  return (
    <>
      {screen === "title" && (
        <TitleScreen
          talismans={profile?.talismans ?? null}
          onSolo={() => {
            setSoloMode("normal");
            setScreen("solo");
          }}
          onDaily={() => {
            setSoloMode("daily");
            setScreen("solo");
          }}
          onPractice={() => {
            setSoloMode("practice");
            setScreen("solo");
          }}
          onOnline={() => setScreen("online")}
          onSettings={() => setScreen("settings")}
          onShop={() => setScreen("shop")}
          onStats={() => setScreen("stats")}
          onTutorial={() => setShowTutorial(true)}
        />
      )}
      {screen === "settings" && (
        <SettingsPanel onClose={() => setScreen("title")} />
      )}
      {screen === "shop" && (
        <TalismanShop
          profile={profile}
          onClose={() => setScreen("title")}
          onPurchase={purchase}
        />
      )}
      {screen === "stats" && (
        <StatsScreen profile={profile} onClose={() => setScreen("title")} />
      )}
      {showTutorial && <Tutorial onClose={onTutorialClose} />}
      <ToastFeed />
    </>
  );
}
