import { useEffect, useMemo, useRef, useState } from "react";
import Phaser from "phaser";
import { CHARACTER_LIST, type CharacterId } from "@jjk/game-core";
import { soloEngine } from "./game/solo/SoloEngine";
import { createPhaserGame } from "./game/createPhaserGame";
import { VirtualJoystick } from "./game/VirtualJoystick";
import { KeyboardInput } from "./game/KeyboardInput";
import {
  loadLastCharacter,
  loadSettings,
  rememberCharacter,
  saveHighScore,
  type GameSettings,
} from "./game/settings";
import { audioManager } from "./audio/AudioManager";
import { fetchDailySeed, talismansFromRun, type MetaProfile, type RunRecord } from "./meta/metaApi";
import { effectsFor } from "./meta/unlocks";
import { withSetBonuses } from "./meta/setBonuses";
import { unlockedExtras } from "./meta/achievementUnlocks";
import { newlyEarned } from "./meta/achievements";
import { eventBus } from "./game/eventBus";
import { haptic } from "./discord/discordExtras";
import { SoloLobby } from "./ui/SoloLobby";
import { SoloHud } from "./ui/SoloHud";
import { DraftOverlay } from "./ui/DraftOverlay";
import { PauseMenu } from "./ui/PauseMenu";
import { Results } from "./ui/Results";
import { pickTip } from "./ui/TipsToast";
import { SettingsPanel } from "./ui/SettingsPanel";
import { SoloRunScene } from "./game/scenes/SoloRunScene";
import { DamageFlash } from "./ui/DamageFlash";
import { RunStats } from "./ui/RunStats";
import { QuitConfirm } from "./ui/QuitConfirm";
import { MutatorPicker } from "./ui/MutatorPicker";
import { StagePicker } from "./ui/StagePicker";
import { TechniqueDetailModal } from "./ui/TechniqueDetailModal";
import { DEFAULT_STAGE, getStage, type MutatorId, type StageId } from "@jjk/game-core";
import { recordDailyScore } from "./meta/dailyLeaderboard";

interface SoloAppProps {
  onBack: () => void;
  mode: "normal" | "daily" | "practice";
  profile: MetaProfile | null;
  recordRun: (payload: {
    record: RunRecord;
    talismanDelta?: number;
    newAchievements?: string[];
    dailySeed?: string;
    dailyBest?: number;
  }) => Promise<MetaProfile | null>;
}

export function SoloApp({ onBack, mode, profile, recordRun }: SoloAppProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserRef = useRef<Phaser.Game | null>(null);
  const joystickRef2 = useRef<VirtualJoystick | null>(null);
  const keyboardRef = useRef<KeyboardInput | null>(null);

  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [character, setCharacter] = useState<CharacterId>(() => loadLastCharacter());
  const [snap, setSnap] = useState(soloEngine.snapshot());
  const [started, setStarted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [fps, setFps] = useState(60);
  const [dailySeed, setDailySeed] = useState<string | null>(null);
  const [resultsTotal, setResultsTotal] = useState<number | null>(null);
  const [muteFlash, setMuteFlash] = useState<string | null>(null);
  const muteFlashTimerRef = useRef<number | undefined>(undefined);
  const submittedRef = useRef(false);
  const earlyExit = mode === "daily" || mode === "practice";

  const [mutatorIds, setMutatorIds] = useState<MutatorId[]>([]);
  const [stage, setStage] = useState<StageId>(DEFAULT_STAGE);
  const [techDetailId, setTechDetailId] = useState<string | null>(null);

  const effects = useMemo(
    () => withSetBonuses(effectsFor(profile?.unlocks ?? []), profile?.unlocks ?? []),
    [profile?.unlocks]
  );
  const extras = useMemo(() => unlockedExtras(profile), [profile]);
  const subtitle =
    mode === "daily"
      ? "Daily challenge"
      : mode === "practice"
      ? "Practice mode (no rewards)"
      : undefined;

  useEffect(() => {
    soloEngine.setEffects(effects);
  }, [effects]);

  useEffect(() => {
    if (mode === "daily") {
      void fetchDailySeed().then((seed) => {
        setDailySeed(seed);
        soloEngine.setSeed(seed);
      });
    } else {
      soloEngine.setSeed(null);
    }
  }, [mode]);

  useEffect(() => {
    soloEngine.setPracticeMode(mode === "practice");
  }, [mode]);

  useEffect(() => {
    audioManager.applyVolumes(settings.musicVolume, settings.sfxVolume);
  }, [settings.musicVolume, settings.sfxVolume]);

  useEffect(() => {
    soloEngine.selectCharacter(character);
    const unsub = soloEngine.subscribe(setSnap);
    return () => {
      unsub();
      soloEngine.destroy();
    };
    // `character` intentionally captured at mount only — later swaps run via the
    // sibling effect on [character, started].
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (started) soloEngine.selectCharacter(character);
  }, [character, started]);

  useEffect(() => {
    if (!gameRef.current || phaserRef.current) return;
    phaserRef.current = createPhaserGame(gameRef.current, "solo");
    // React 18 StrictMode dev double-invokes effects. If the previous mount
    // already called scene.start("SoloRun"), the destroyed game can't carry
    // that over to the fresh instance — kick the run scene again here once
    // Phaser is back up so the canvas isn't stuck on a black BootScene.
    if (started) {
      phaserRef.current.scene.start("SoloRun");
    }
    return () => {
      phaserRef.current?.destroy(true);
      phaserRef.current = null;
    };
    // `started` is intentionally read at mount only — the SoloRun kick-restart
    // is just a recovery path for StrictMode's double-invoke. Adding it as a
    // dep would tear down and recreate the live Phaser game on every state
    // flip, which is exactly what we want to avoid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pause on tab hidden (solo)
  useEffect(() => {
    if (!started || !settings.pauseOnHidden) return;
    const onVis = () => {
      if (document.hidden && soloEngine.phase === "run") soloEngine.pause();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [started, settings.pauseOnHidden]);

  // Event listeners — haptics + per-character voice cues.
  // Keep settings in a ref so we don't re-subscribe on every settings change.
  const hapticsOnRef = useRef(settings.hapticsOn);
  useEffect(() => {
    hapticsOnRef.current = settings.hapticsOn;
  }, [settings.hapticsOn]);
  useEffect(() => {
    return eventBus.on((e) => {
      const char = soloEngine.characterId;
      if (hapticsOnRef.current) {
        if (e.kind === "level_up") haptic("light");
        if (e.kind === "downed") haptic("heavy");
        if (e.kind === "boss_spawn") haptic("medium");
        // Per-tech haptics (Tier 5 #21) — ultimate gets the heaviest buzz,
        // domain medium, dash a flick. These complement the audio cues.
        if (e.kind === "ultimate") haptic("heavy");
        if (e.kind === "domain") haptic("medium");
        if (e.kind === "dash") haptic("light");
      }
      if (e.kind === "level_up") audioManager.playCharacterShout(char, "levelup");
      if (e.kind === "downed" && e.username === "You") audioManager.playCharacterShout(char, "down");
      if (e.kind === "boss_spawn") audioManager.playCharacterShout(char, "boss");
      if (e.kind === "ultimate") audioManager.playCharacterShout(char, "domain");
    });
  }, []);

  // Music layer transitions — derive a coarse layer string so the dep
  // only changes when the layer actually changes, not every 50ms tick.
  const musicLayer: "boss" | "combat" | "calm" = snap.bossSpawned
    ? "boss"
    : snap.elapsed > 60
    ? "combat"
    : "calm";
  useEffect(() => {
    if (!started) return;
    audioManager.setMusicLayer(musicLayer);
  }, [started, musicLayer]);

  // Heartbeat audio when the player is dangerously low on HP. We use a coarse
  // boolean to keep this effect from re-running every frame.
  const lowHpActive =
    started &&
    !snap.player.downed &&
    snap.phase === "run" &&
    snap.player.hp > 0 &&
    snap.player.hp / snap.player.maxHp < 0.25;
  useEffect(() => {
    audioManager.setLowHp(lowHpActive);
    return () => audioManager.setLowHp(false);
  }, [lowHpActive]);

  // Auto-start in skip-lobby mode (except daily, where seed must load first).
  // `started` intentionally not in deps — handleStart sets it and we guard with the ref.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current || started) return;
    if (
      (mode === "normal" && settings.skipSoloLobby) ||
      mode === "practice" ||
      (mode === "daily" && dailySeed)
    ) {
      autoStartedRef.current = true;
      handleStart();
    }
    // handleStart and `started` intentionally omitted: ref-guarded and reading
    // latest closure values each render is fine; we only want this to react to
    // mode/seed/setting changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dailySeed, settings.skipSoloLobby]);

  // Keyboard + music when a session starts.
  useEffect(() => {
    if (!started) return;
    keyboardRef.current = new KeyboardInput();
    // Pre-warm the music with the picked stage's theme so the chord pad
    // is correct from the first note (otherwise the user briefly hears the
    // default C-minor pad before the scene swaps it).
    const startStage = getStage(stage);
    if (startStage) audioManager.setMusicTheme(startStage.music);
    audioManager.startMusic();

    const fpsLoop = setInterval(() => {
      const game = phaserRef.current;
      if (game) setFps(game.loop.actualFps);
    }, 500);

    const onVis = () => {
      if (document.hidden && soloEngine.phase === "run") soloEngine.pause();
    };
    document.addEventListener("visibilitychange", onVis);

    // Mute toggle hotkey — handled here so it works even from the pause menu.
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyM" && !e.repeat) {
        const muted = audioManager.toggleMuted();
        setMuteFlash(muted ? "Muted" : "Sound on");
        window.clearTimeout(muteFlashTimerRef.current);
        muteFlashTimerRef.current = window.setTimeout(() => setMuteFlash(null), 1500);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      clearInterval(fpsLoop);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("keydown", onKey);
      keyboardRef.current?.destroy();
      keyboardRef.current = null;
      joystickRef2.current?.destroy();
      joystickRef2.current = null;
      audioManager.stopMusic();
    };
    // `stage` is read once on run start to pre-warm the music theme; further
    // stage changes flow through the scene effect, so we intentionally omit it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  // Floating joystick — active only during run / pause (document-level touch).
  const runUiActive =
    started && (snap.phase === "run" || snap.phase === "paused");
  useEffect(() => {
    if (!runUiActive) {
      joystickRef2.current?.destroy();
      joystickRef2.current = null;
      return;
    }
    joystickRef2.current?.destroy();
    joystickRef2.current = new VirtualJoystick({ largeTouch: settings.largeTouch });
    return () => {
      joystickRef2.current?.destroy();
      joystickRef2.current = null;
    };
  }, [runUiActive, settings.largeTouch]);

  // Settings that mutate during a run (reduce-motion / color-blind) just
  // forward to the live scene each tick of the input loop. Keep them in refs
  // so the input-loop effect itself never tears down.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
    // Keyboard bindings may have changed via the configure panel
    keyboardRef.current?.refreshBindings?.();
  }, [settings]);

  // Input poll loop. Recreated only when `started` flips — never on settings.
  useEffect(() => {
    if (!started) return;
    const inputLoop = setInterval(() => {
      const s = settingsRef.current;
      const kb = keyboardRef.current?.getVector() ?? { moveX: 0, moveY: 0, aimAngle: 0 };
      const js = joystickRef2.current?.getState() ?? { moveX: 0, moveY: 0, active: false };
      const moveX = js.active && Math.hypot(js.moveX, js.moveY) > 0.1 ? js.moveX : kb.moveX;
      const moveY = js.active && Math.hypot(js.moveX, js.moveY) > 0.1 ? js.moveY : kb.moveY;
      const aim =
        Math.hypot(moveX, moveY) > 0.1 ? Math.atan2(moveY, moveX) : kb.aimAngle;
      soloEngine.setInput(moveX, moveY, aim);

      const scene = phaserRef.current?.scene.getScene("SoloRun") as SoloRunScene | undefined;
      scene?.setReduceMotion(s.reduceMotion);
      scene?.setColorBlind(s.colorBlind);

      if (keyboardRef.current?.consumeAction("domain")) {
        soloEngine.triggerDomain();
        audioManager.playDomain();
        audioManager.playCharacterShout(soloEngine.characterId, "domain");
      }
      if (keyboardRef.current?.consumeAction("dash")) {
        soloEngine.dash();
      }
      if (keyboardRef.current?.consumeAction("ultimate")) {
        if (soloEngine.triggerUltimate()) {
          audioManager.playDomain();
          audioManager.playCharacterShout(soloEngine.characterId, "domain");
        }
      }
      if (
        keyboardRef.current?.consumeAction("pause") ||
        keyboardRef.current?.consumeAction("menu")
      ) {
        if (soloEngine.phase === "run") soloEngine.pause();
        else if (soloEngine.phase === "paused") soloEngine.resume();
      }
    }, 50);
    return () => clearInterval(inputLoop);
  }, [started]);

  // Auto-pick — derive a stable boolean so the effect doesn't fire every tick.
  const shouldAutoPick =
    settings.autoPickUpgrade && snap.player.choosingUpgrade && snap.draftOptions.length > 0;
  useEffect(() => {
    if (!shouldAutoPick) return;
    soloEngine.autoPickUpgrade();
    audioManager.playLevelUp();
  }, [shouldAutoPick]);

  // Submit run record once when the phase first becomes "results". Guarded by a ref
  // so re-renders never re-fire the record. Reads everything else lazily.
  useEffect(() => {
    if (snap.phase !== "results" || submittedRef.current) return;
    submittedRef.current = true;
    if (mode === "practice") return;

    const earned = talismansFromRun(snap.exorcismCount);
    const record: RunRecord = {
      ts: Date.now(),
      characterId: snap.player.characterId,
      exorcismCount: snap.exorcismCount,
      grade: snap.grade,
      durationSec: Math.floor(snap.elapsed),
      mode: mode === "daily" ? "daily" : "solo",
    };
    const baseProfile = profile ?? {
      talismans: 0,
      unlocks: [],
      achievements: [],
      history: [],
      characterStats: {},
    };
    const earnedAch = newlyEarned({
      profile: baseProfile,
      record,
      level: snap.player.level,
      bossDefeated: soloEngine.bossDefeated,
      domainUsed: soloEngine.domainEverUsed,
    });
    saveHighScore(snap.exorcismCount);
    void recordRun({
      record,
      talismanDelta: earned,
      newAchievements: earnedAch.map((a) => a.id),
      dailySeed: mode === "daily" ? dailySeed ?? undefined : undefined,
      dailyBest: mode === "daily" ? snap.exorcismCount : undefined,
    }).then((updated) => {
      if (updated) setResultsTotal(updated.talismans);
      for (const a of earnedAch) {
        eventBus.emit({ kind: "achievement", id: a.id, label: a.label });
      }
    });
    // Local-cache daily leaderboard score (Tier 4 #15) — separate from the
    // server-side personal best so we can render a multi-row "today's runs"
    // list if more players later show up.
    if (mode === "daily" && dailySeed && snap.exorcismCount > 0) {
      recordDailyScore(dailySeed, {
        user: profile?.dailyBest != null ? "You" : "You",
        score: snap.exorcismCount,
        ts: Date.now(),
      });
    }
    // Intentionally minimal deps — only react to phase transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.phase]);

  function handleStart() {
    rememberCharacter(character);
    setStarted(true);
    submittedRef.current = false;
    setResultsTotal(null);
    soloEngine.setRunConfig(mutatorIds, stage, extras);
    soloEngine.startRun();
    phaserRef.current?.scene.start("SoloRun");
    audioManager.playUiClick();
  }

  const handlePick = (id: string) => {
    soloEngine.pickUpgrade(id as never);
    audioManager.playLevelUp();
  };

  const handleRandomDraft = () => {
    if (!snap.draftOptions.length) return;
    const pick = snap.draftOptions[Math.floor(Math.random() * snap.draftOptions.length)];
    handlePick(pick);
  };

  const handleResultsReturn = () => {
    onBack();
  };

  const handleRetry = () => {
    submittedRef.current = false;
    setResultsTotal(null);
    soloEngine.setRunConfig(mutatorIds, stage, extras);
    soloEngine.startRun();
    phaserRef.current?.scene.start("SoloRun");
    audioManager.playUiClick();
  };

  if (!started) {
    return (
      <div className="app-shell solo-prelude">
        <div className="game-container" ref={gameRef} />
        <SoloLobby
          selected={character}
          onSelect={(id) => {
            setCharacter(id);
            rememberCharacter(id);
          }}
          onStart={handleStart}
          onBack={onBack}
          extras={
            <>
              {mode === "normal" && (
                <>
                  <StagePicker selected={stage} onChange={setStage} />
                  <MutatorPicker selected={mutatorIds} onChange={setMutatorIds} />
                </>
              )}
            </>
          }
        />
      </div>
    );
  }

  const showRun = snap.phase === "run" || snap.phase === "paused";
  const charName = CHARACTER_LIST.find((c) => c.id === snap.player.characterId)?.name;
  const earned = talismansFromRun(snap.exorcismCount);

  return (
    <div
      className={`app-shell ${showRun ? "in-run" : ""} ${settings.largeTouch ? "large-touch" : ""} ${settings.colorBlind ? "color-blind" : ""}`}
      style={{ ["--hud-scale" as never]: settings.hudScale }}
    >
      <div className="game-container" ref={gameRef} />
      <DamageFlash hp={snap.player.hp} maxHp={snap.player.maxHp} />
      {muteFlash && <div className="mute-flash" aria-live="polite">{muteFlash}</div>}

      {showRun && (
        <>
          <SoloHud
            snap={snap}
            fps={fps}
            showFps={settings.showFps}
            tip={settings.showTips ? pickTip(snap.elapsed) : undefined}
            onDomain={() => {
              soloEngine.triggerDomain();
              audioManager.playDomain();
            }}
            onPause={() => soloEngine.pause()}
            onDash={() => soloEngine.dash()}
            onUlt={() => {
              if (soloEngine.triggerUltimate()) {
                audioManager.playDomain();
                if (hapticsOnRef.current) haptic("heavy");
              }
            }}
            onTechChipClick={(id) => setTechDetailId(id)}
          />
          {settings.showRunStats && (
            <RunStats
              elapsed={snap.elapsed}
              exorcismCount={snap.exorcismCount}
              hp={snap.player.hp}
            />
          )}
          {snap.player.choosingUpgrade && snap.draftOptions.length > 0 && (
            <DraftOverlay
              options={snap.draftOptions}
              ownedTechniqueIds={snap.player.techniques.map((t) => t.id)}
              rerollsRemaining={soloEngine.rerollsRemaining}
              banishesRemaining={soloEngine.banishesRemaining}
              onPick={handlePick}
              onRandom={handleRandomDraft}
              onReroll={() => soloEngine.rerollDraft()}
              onBanish={(id) => soloEngine.banishDraft(id as never)}
            />
          )}
          {snap.phase === "paused" && (
            <PauseMenu
              onResume={() => soloEngine.resume()}
              onQuit={() => setShowQuitConfirm(true)}
              onSettings={() => setShowSettings(true)}
            />
          )}
          {showQuitConfirm && (
            <QuitConfirm
              exorcismCount={snap.exorcismCount}
              onCancel={() => setShowQuitConfirm(false)}
              onConfirm={() => {
                setShowQuitConfirm(false);
                soloEngine.quitToResults();
              }}
            />
          )}
        </>
      )}

      {snap.phase === "results" && (
        <Results
          grade={snap.grade}
          exorcismCount={snap.exorcismCount}
          onReturn={handleResultsReturn}
          onRetry={handleRetry}
          subtitle={charName ? `as ${charName}${subtitle ? ` · ${subtitle}` : ""}` : subtitle}
          talismanEarned={mode === "practice" ? 0 : earned}
          totalTalismans={
            resultsTotal != null
              ? resultsTotal
              : profile != null && mode !== "practice"
              ? profile.talismans + earned
              : null
          }
          telemetry={snap.telemetry}
          durationSec={Math.floor(snap.elapsed)}
          characterId={snap.player.characterId}
          replayFrames={soloEngine.getReplayFrames()}
        />
      )}

      {techDetailId && (
        <TechniqueDetailModal
          technique={
            snap.player.techniques.find((t) => t.id === techDetailId) ?? {
              id: techDetailId as never,
              level: 1,
            }
          }
          ownedIds={snap.player.techniques.map((t) => t.id)}
          onClose={() => setTechDetailId(null)}
        />
      )}

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} onChange={setSettings} showRunOnlyToggles />
      )}
    </div>
  );
}
