import { useCallback, useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { CHARACTER_LIST, RUN_DURATION_SEC } from "@jjk/game-core";
import { useDiscord } from "./discord/DiscordProvider";
import { discordAvatarUrl, haptic, openInvite, updateActivity } from "./discord/discordExtras";
import { gameClient, type ConnectionState } from "./game/GameClient";
import { createPhaserGame } from "./game/createPhaserGame";
import { VirtualJoystick } from "./game/VirtualJoystick";
import { KeyboardInput } from "./game/KeyboardInput";
import { RunScene } from "./game/scenes/RunScene";
import { shouldMuteMusic } from "./game/thermal";
import { audioManager } from "./audio/AudioManager";
import { pickBestDraftOption } from "./game/draftPick";
import { loadSettings, rememberCharacter, saveHighScore, type GameSettings } from "./game/settings";
import { talismansFromRun, type RunRecord } from "./meta/metaApi";
import { newlyEarned } from "./meta/achievements";
import { saveLastBuild } from "./meta/lastBuild";
import { useMeta } from "./meta/useMeta";
import { useMetaUserId } from "./meta/useMetaUserId";
import { eventBus, type PingTag } from "./game/eventBus";
import { Lobby } from "./ui/Lobby";
import { saveLastParty, type PartyMember } from "./meta/lastParty";
import { Hud } from "./ui/Hud";
import { DraftOverlay } from "./ui/DraftOverlay";
import { PauseMenu } from "./ui/PauseMenu";
import { Results } from "./ui/Results";
import { SettingsPanel } from "./ui/SettingsPanel";
import { ReviveOverlay } from "./ui/ReviveOverlay";
import { DomainIndicator } from "./ui/DomainIndicator";
import { pickTip } from "./ui/TipsToast";
import { DamageFlash } from "./ui/DamageFlash";
import { RunStats } from "./ui/RunStats";
import { QuitConfirm } from "./ui/QuitConfirm";
import { ConnectionBanner } from "./ui/ConnectionBanner";
import { PingWheel } from "./ui/PingWheel";

interface OnlineAppProps {
  onBack: () => void;
}

export function OnlineApp({ onBack }: OnlineAppProps) {
  const discord = useDiscord();
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserRef = useRef<Phaser.Game | null>(null);
  const joystickInstance = useRef<VirtualJoystick | null>(null);
  const keyboardRef = useRef<KeyboardInput | null>(null);

  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [pingMs, setPingMs] = useState(0);
  const [connected, setConnected] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(() => loadSettings().lastCharacter);
  const [isReady, setIsReady] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showPingWheel, setShowPingWheel] = useState(false);
  const [fps, setFps] = useState(60);
  const [readyCountdown, setReadyCountdown] = useState(0);
  const [, forceTick] = useState(0);
  // Spectator camera anchor — incremented by a tap/key so a dead player can
  // cycle through alive teammates' POVs (Tier 3 #14).
  const [spectatorIdx, setSpectatorIdx] = useState(0);
  const joinAttempted = useRef(false);
  const runRecordedRef = useRef(false);

  const { userId } = useMetaUserId();
  const { profile, recordRun, addTalismansFallback } = useMetaCompat(userId);

  const state = gameClient.state;
  const sessionId = gameClient.sessionId;
  const phase = state?.phase ?? "connecting";

  const me = sessionId && state ? state.players.get(sessionId) : null;
  const charName = me
    ? CHARACTER_LIST.find((c) => c.id === me.characterId)?.name
    : undefined;

  // Refs for values read inside long-running intervals so they don't need to be deps.
  const myCharIdRef = useRef<string | null>(null);
  const myUsernameRef = useRef<string | null>(null);
  useEffect(() => {
    myCharIdRef.current = me?.characterId ?? null;
    myUsernameRef.current = me?.username ?? null;
  });

  useEffect(() => {
    audioManager.applyVolumes(settings.musicVolume, settings.sfxVolume);
  }, [settings.musicVolume, settings.sfxVolume]);

  useEffect(() => {
    return gameClient.onConnectionState(setConnectionState);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setPingMs(gameClient.pingMs), 1000);
    return () => clearInterval(id);
  }, []);

  // Keep latest selectedCharacter in a ref so connectRoom identity stays stable
  // and a character swap never tears down the room.
  const selectedCharacterRef = useRef(selectedCharacter);
  useEffect(() => {
    selectedCharacterRef.current = selectedCharacter;
  }, [selectedCharacter]);

  const connectRoom = useCallback(async () => {
    if (!discord.ready || !discord.user || !discord.instanceId) return;
    try {
      await gameClient.join({
        instanceId: discord.instanceId,
        accessToken: discord.accessToken ?? "dev-token",
        discordUserId: discord.user.id,
        username: discord.user.globalName ?? discord.user.username,
        characterId: selectedCharacterRef.current,
      });
      setConnected(true);
      setConnectError(null);
      gameClient.room?.onStateChange(() => forceTick((n) => n + 1));
      gameClient.room?.onMessage(
        "ready_countdown",
        (data: { secs: number }) => setReadyCountdown(data.secs)
      );
      phaserRef.current?.scene.start("Run");
    } catch (err) {
      console.error("[game] join failed", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      const friendly = /participant|instance/i.test(msg)
        ? "Discord instance check failed — make sure you're in the Activity"
        : /timeout|network/i.test(msg)
        ? "Couldn't reach the game server — try again"
        : /room/i.test(msg)
        ? "Room is full or unavailable"
        : msg;
      setConnectError(friendly);
    }
  }, [discord.ready, discord.user, discord.instanceId, discord.accessToken]);

  useEffect(() => {
    if (!discord.ready || !discord.authenticated || !discord.instanceId) return;
    if (joinAttempted.current) return;
    joinAttempted.current = true;
    void connectRoom();
    return () => {
      gameClient.leave();
      joinAttempted.current = false;
    };
  }, [discord.ready, discord.authenticated, discord.instanceId, connectRoom]);

  useEffect(() => {
    if (!gameRef.current || phaserRef.current) return;
    phaserRef.current = createPhaserGame(gameRef.current, "online");
    phaserRef.current.scene.start("Boot");
    return () => {
      phaserRef.current?.destroy(true);
      phaserRef.current = null;
    };
  }, []);

  const showJoystick = phase === "run" && !paused && me && !me.spectating;
  useEffect(() => {
    if (!showJoystick) {
      joystickInstance.current?.destroy();
      joystickInstance.current = null;
      return;
    }
    joystickInstance.current?.destroy();
    joystickInstance.current = new VirtualJoystick({ largeTouch: settings.largeTouch });
    return () => {
      joystickInstance.current?.destroy();
      joystickInstance.current = null;
    };
  }, [showJoystick, settings.largeTouch]);

  useEffect(() => {
    if (phase !== "run") return;
    keyboardRef.current = new KeyboardInput();
    return () => keyboardRef.current?.destroy();
  }, [phase]);

  useEffect(() => {
    if (phase !== "run" || paused) return;
    const id = setInterval(() => {
      const kb = keyboardRef.current?.getVector() ?? { moveX: 0, moveY: 0, aimAngle: 0 };
      const js = joystickInstance.current?.getState();
      const moveX =
        js?.active && Math.hypot(js.moveX, js.moveY) > 0.1 ? js.moveX : kb.moveX;
      const moveY =
        js?.active && Math.hypot(js.moveX, js.moveY) > 0.1 ? js.moveY : kb.moveY;
      const scene = phaserRef.current?.scene.getScene("Run") as RunScene | undefined;
      scene?.setJoystick(moveX, moveY);
      scene?.setThermalLevel(discord.thermalLevel);
      scene?.setReduceMotion(settings.reduceMotion);
      scene?.setColorBlind(settings.colorBlind);

      if (keyboardRef.current?.consumeAction("domain")) {
        scene?.triggerDomain();
        const char = myCharIdRef.current;
        if (char) audioManager.playCharacterShout(char, "domain");
      }
      if (
        keyboardRef.current?.consumeAction("pause") ||
        keyboardRef.current?.consumeAction("menu")
      ) {
        setPaused((p) => !p);
      }
      if (keyboardRef.current?.consumeAction("ping")) setShowPingWheel(true);
    }, 50);
    return () => clearInterval(id);
  }, [phase, paused, discord.thermalLevel, settings.reduceMotion, settings.colorBlind]);

  useEffect(() => {
    if (phase !== "run") return;
    const id = setInterval(() => {
      const game = phaserRef.current;
      if (game) setFps(game.loop.actualFps);
    }, 500);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    audioManager.setMusicMuted(shouldMuteMusic(discord.thermalLevel));
  }, [discord.thermalLevel]);

  useEffect(() => {
    if (phase === "run") audioManager.startMusic();
    if (phase === "results") audioManager.stopMusic();
    // Snapshot the party as soon as a run begins so the title screen can
    // offer a "run it back with last team" affordance (Tier 3 #13).
    if (phase === "run" && state) {
      const members: PartyMember[] = [...state.players.values()].map((p) => ({
        username: p.username,
        characterId: p.characterId,
      }));
      saveLastParty(members);
    }
    // Reset the spectator cycle anchor when entering/leaving run.
    setSpectatorIdx(0);
  }, [phase, state]);

  // Music layer transitions — derive coarse string so we only react to layer flips,
  // not the per-tick elapsed counter (which would re-fire 20×/s).
  const musicLayer: "boss" | "combat" | "calm" = !state
    ? "calm"
    : state.bossSpawned
    ? "boss"
    : state.elapsed > 60
    ? "combat"
    : "calm";
  useEffect(() => {
    audioManager.setMusicLayer(musicLayer);
  }, [musicLayer]);

  // Haptics + voice cues — refs avoid re-subscribing on every state churn.
  const hapticsOnRef = useRef(settings.hapticsOn);
  useEffect(() => {
    hapticsOnRef.current = settings.hapticsOn;
  }, [settings.hapticsOn]);
  useEffect(() => {
    return eventBus.on((e) => {
      if (hapticsOnRef.current) {
        if (e.kind === "level_up") haptic("light");
        if (e.kind === "downed") haptic("heavy");
        if (e.kind === "boss_spawn") haptic("medium");
      }
      const char = myCharIdRef.current;
      if (!char) return;
      if (e.kind === "level_up") audioManager.playCharacterShout(char, "levelup");
      if (e.kind === "boss_spawn") audioManager.playCharacterShout(char, "boss");
      if (e.kind === "downed" && e.username === myUsernameRef.current) {
        audioManager.playCharacterShout(char, "down");
      }
    });
  }, []);

  // Rich presence updates — bucket elapsed into 5s slots so deps don't churn each tick.
  const remainingBucket = state
    ? Math.floor(Math.max(0, RUN_DURATION_SEC - Math.floor(state.elapsed)) / 5)
    : 0;
  useEffect(() => {
    if (!discord.discordSdk || !discord.instanceId) return;
    const remaining = state ? Math.max(0, RUN_DURATION_SEC - Math.floor(state.elapsed)) : undefined;
    const partySize = state ? state.players.size : 1;
    void updateActivity(discord.discordSdk, {
      phase:
        phase === "lobby"
          ? "lobby"
          : phase === "run"
          ? "run"
          : phase === "results"
          ? "results"
          : "menu",
      instanceId: discord.instanceId,
      characterName: charName,
      wave: state?.wave,
      remainingSec: remaining,
      partySize,
      bossSpawned: state?.bossSpawned,
    });
    // Intentionally read state lazily and only refresh on bucketed elapsed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    discord.discordSdk,
    discord.instanceId,
    phase,
    charName,
    state?.wave,
    state?.bossSpawned,
    remainingBucket,
  ]);

  const showDraft =
    !paused &&
    me?.choosingUpgrade &&
    state?.draftOptions &&
    state.draftOptions.length > 0 &&
    state.draftingPlayerId === sessionId;

  // Auto-pick fires off a single click; protect from per-tick re-fires using a ref.
  const autoPickedRef = useRef(false);
  useEffect(() => {
    if (!showDraft) {
      autoPickedRef.current = false;
      return;
    }
    if (!settings.autoPickUpgrade || autoPickedRef.current) return;
    const first = state?.draftOptions?.[0];
    if (first) {
      autoPickedRef.current = true;
      gameClient.pickUpgrade(first);
      audioManager.playLevelUp();
    }
  }, [showDraft, settings.autoPickUpgrade, state?.draftOptions]);

  // Submit run record once results land. Guarded by ref; intentionally only depends on phase
  // so we don't re-evaluate every Colyseus tick.
  useEffect(() => {
    if (phase !== "results" || runRecordedRef.current || !state || !userId) return;
    runRecordedRef.current = true;
    const earned = talismansFromRun(state.exorcismCount);
    saveHighScore(state.exorcismCount);
    const myChar = me?.characterId ?? selectedCharacterRef.current;

    saveLastBuild({
      ts: Date.now(),
      characterId: myChar,
      techniques: [...(me?.techniques ?? [])].flatMap((t) =>
        t ? [{ id: t.id as never, level: t.level }] : []
      ),
    });

    const myLevel = me?.level ?? 1;
    const record: RunRecord = {
      ts: Date.now(),
      characterId: myChar,
      exorcismCount: state.exorcismCount,
      grade: state.grade,
      durationSec: Math.floor(state.elapsed),
      mode: "online",
    };
    const baseProfile = profile ?? {
      talismans: 0,
      unlocks: [],
      achievements: [],
      history: [],
      characterStats: {},
    };
    const ach = newlyEarned({
      profile: baseProfile,
      record,
      level: myLevel,
      bossDefeated: state.bossSpawned && state.bossHp <= 0,
      domainUsed: !!me?.domainUsed,
    });
    if (recordRun) {
      void recordRun({
        record,
        talismanDelta: earned,
        newAchievements: ach.map((a) => a.id),
      }).then(() => {
        for (const a of ach) eventBus.emit({ kind: "achievement", id: a.id, label: a.label });
      });
    } else {
      void addTalismansFallback?.(earned);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleResultsReturn = () => {
    gameClient.leave();
    onBack();
  };

  const handlePick = (id: string) => {
    gameClient.pickUpgrade(id);
    audioManager.playLevelUp();
  };

  const handleRandomDraft = () => {
    if (!state?.draftOptions.length) return;
    const opts = [...state.draftOptions].filter((s): s is string => !!s);
    if (!opts.length) return;
    handlePick(opts[Math.floor(Math.random() * opts.length)]);
  };

  const handlePing = (tag: PingTag) => {
    if (!me) return;
    gameClient.sendPing(me.x, me.y, tag);
    setShowPingWheel(false);
  };

  const isSpectating = !!(me?.spectating && phase === "run");
  const cycleSpectator = () => {
    setSpectatorIdx((n) => n + 1);
  };
  // Reflect React state into the live Phaser scene — its update() reads
  // `scene.spectatorIdx` directly so we just keep the two in sync.
  useEffect(() => {
    const scene = phaserRef.current?.scene.getScene("Run") as
      | RunScene
      | undefined;
    if (scene) scene.spectatorIdx = spectatorIdx;
  }, [spectatorIdx]);

  if (!discord.ready) {
    return (
      <div className="loading-screen">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <p>Connecting to Discord…</p>
      </div>
    );
  }

  return (
    <div
      className={`app-shell ${phase === "run" || phase === "paused" ? "in-run" : ""} ${settings.largeTouch ? "large-touch" : ""} ${settings.colorBlind ? "color-blind" : ""}`}
      style={{ ["--hud-scale" as never]: settings.hudScale }}
    >
      <button type="button" className="btn btn-ghost back-btn" onClick={onBack}>
        ← Menu
      </button>
      <div className="game-container" ref={gameRef} />
      <DamageFlash hp={me?.hp ?? 100} maxHp={me?.maxHp ?? 100} />
      <ConnectionBanner state={connectionState} pingMs={pingMs} onLeave={handleResultsReturn} />

      {connectError && (
        <div className="loading-screen overlay-panel">
          <p className="error-banner">{connectError}</p>
          <button type="button" className="btn btn-primary" onClick={() => void connectRoom()}>
            Retry join
          </button>
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Play Solo instead
          </button>
        </div>
      )}

      {!connected && !connectError && (
        <div className="loading-screen overlay-panel">
          <p>Joining Shibuya room…</p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 8 }}>
            Server: npm run dev:server · SKIP_INSTANCE_VERIFY in .env for local dev
          </p>
        </div>
      )}

      {connected && state && phase === "lobby" && (
        <Lobby
          state={state}
          selectedCharacter={selectedCharacter}
          readyCountdown={readyCountdown}
          discordSdk={discord.discordSdk}
          onSelectCharacter={(id) => {
            setSelectedCharacter(id as never);
            rememberCharacter(id as never);
            gameClient.sendCharacter(id);
          }}
          onReady={(r) => {
            setIsReady(r);
            gameClient.sendReady(r);
          }}
          onStart={() => gameClient.startRun()}
          onInvite={() => void openInvite(discord.discordSdk)}
          isHost={gameClient.isHost()}
          isReady={isReady}
        />
      )}

      {isSpectating && (
        <button
          type="button"
          className="btn btn-secondary spectator-cycle-btn"
          onClick={cycleSpectator}
        >
          Spectating · Cycle
        </button>
      )}

      {connected && state && phase === "run" && (
        <>
          <Hud
            state={state}
            sessionId={sessionId}
            fps={fps}
            showFps={settings.showFps}
            tip={settings.showTips ? pickTip(state.elapsed) : undefined}
            largeTouch={settings.largeTouch}
            onDomain={() => {
              (phaserRef.current?.scene.getScene("Run") as RunScene)?.triggerDomain();
              audioManager.playDomain();
            }}
            onPause={() => setPaused(true)}
            onPing={() => setShowPingWheel(true)}
          />
          {settings.showRunStats && me && (
            <RunStats
              elapsed={state.elapsed}
              exorcismCount={state.exorcismCount}
              hp={me.hp}
            />
          )}
          <DomainIndicator state={state} sessionId={sessionId} />
          <ReviveOverlay state={state} sessionId={sessionId} />
          {showDraft && (
            <DraftOverlay
              options={[...state.draftOptions].filter((s): s is string => !!s)}
              ownedTechniqueIds={me ? [...me.techniques].flatMap((t) => (t ? [t.id] : [])) : []}
              onPick={handlePick}
              onRandom={handleRandomDraft}
              onReroll={() => gameClient.rerollDraft()}
              onBanish={(id) => gameClient.banishDraft(id)}
              rerollsRemaining={1}
              banishesRemaining={1}
            />
          )}
          {paused && (
            <PauseMenu
              onResume={() => setPaused(false)}
              onQuit={() => setShowQuitConfirm(true)}
              onSettings={() => setShowSettings(true)}
            />
          )}
          {showQuitConfirm && (
            <QuitConfirm
              exorcismCount={state.exorcismCount}
              onCancel={() => setShowQuitConfirm(false)}
              onConfirm={handleResultsReturn}
            />
          )}
          {showPingWheel && (
            <PingWheel onPick={handlePing} onClose={() => setShowPingWheel(false)} />
          )}
        </>
      )}

      {connected && state && phase === "results" && (
        <Results
          grade={state.grade}
          exorcismCount={state.exorcismCount}
          onReturn={handleResultsReturn}
          subtitle={charName ? `as ${charName}` : "Co-op exorcism"}
          talismanEarned={talismansFromRun(state.exorcismCount)}
          totalTalismans={
            profile != null
              ? profile.talismans + talismansFromRun(state.exorcismCount)
              : null
          }
        />
      )}

      {/* Float Discord avatars in a strip at the top during run/results */}
      {connected && state && (phase === "run" || phase === "results") && (
        <div className="online-avatar-strip">
          {[...state.players.values()].map((p) => (
            <img
              key={p.sessionId}
              className="online-avatar"
              src={discordAvatarUrl({ id: p.discordUserId }, 48)}
              alt=""
              title={p.username}
              draggable={false}
            />
          ))}
        </div>
      )}

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onChange={setSettings}
          showRunOnlyToggles
        />
      )}
    </div>
  );
}

/** Local hook that reuses useMeta if userId resolves, else exposes a no-op API */
function useMetaCompat(userId: string | null) {
  const meta = useMeta(userId);
  return {
    profile: meta.profile,
    recordRun: userId ? meta.recordRun : null,
    addTalismansFallback: async (_amount: number) => null,
  };
}
