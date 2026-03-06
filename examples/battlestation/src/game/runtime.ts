import {
  cycleTarget,
  fireAt,
  fireShot,
  getMissionView,
  tickMission,
  type MissionView,
} from "../services/backend";
import { publishAlert, type AlertLevel } from "../services/comms";
import {
  loadOperatorProfile,
  recordMissionOutcome,
  saveOperatorProfile,
  type OperatorProfile,
} from "../services/profile";
import type { PlayToneOptions } from "webtau/audio";
import type { ThemeConfig, MissionStubConfig } from "./config";

export type ExplosionType = "hit" | "kill" | "breach";

export interface DefenseSceneAdapter {
  render(view: MissionView): void;
  addProjectile(target: { x: number; y: number }): void;
  addExplosion(x: number, y: number, type: ExplosionType): void;
  dispose(): void;
}

export interface BattlestationAudioAdapter {
  setMasterVolume(value: number): void;
  setMuted(muted: boolean): void;
  resume(): Promise<void> | void;
  playTone(
    frequencyHz: number,
    durationMs: number,
    options: PlayToneOptions,
  ): Promise<void> | void;
}

export interface BattlestationControlSource {
  getSelectionAxis(): number;
  getFirePressed(): boolean;
  getMutePressed(): boolean;
  drainPointerTargets(): Array<{ x: number; y: number }>;
  dispose(): void;
}

export interface BattlestationHudAdapter {
  updateMission(view: MissionView): void;
  updateProfile(profile: OperatorProfile): void;
  setAlert(text: string): void;
  setAlertLog(lines: string[]): void;
  setStatus(text: string): void;
}

export interface StartBattlestationRuntimeOptions {
  mission: MissionStubConfig;
  theme: ThemeConfig;
  scene: DefenseSceneAdapter;
  controls: BattlestationControlSource;
  hud: BattlestationHudAdapter;
  audio: BattlestationAudioAdapter;
}

function axisDirection(value: number): number {
  if (value <= -0.45) return -1;
  if (value >= 0.45) return 1;
  return 0;
}

function alertSummary(level: AlertLevel, message: string): string {
  return `[${level.toUpperCase()}] ${message}`;
}

export async function startBattlestationRuntime(
  options: StartBattlestationRuntimeOptions,
): Promise<() => void> {
  const { mission, theme, scene, controls, hud, audio } = options;

  let profile = await loadOperatorProfile();
  audio.setMasterVolume(profile.masterVolume);
  audio.setMuted(profile.muted);
  hud.updateProfile(profile);

  const alertLog: string[] = [];
  const pushAlert = async (level: AlertLevel, tick: number, message: string) => {
    await publishAlert({ level, tick, message });
    hud.setAlert(alertSummary(level, message));
    alertLog.unshift(`T${tick}: ${message}`);
    alertLog.splice(6);
    hud.setAlertLog(alertLog);
  };

  let view = await getMissionView();
  let lastIntegrity = view.integrity;
  let criticalAlertRaised = false;
  let missionRecorded = false;
  let selectionLatchTime = 0;
  let fireLatch = false;
  let muteLatch = false;
  let inFlight = false;

  hud.updateMission(view);
  scene.render(view);
  await pushAlert("info", 0, `${mission.callsign} online in ${mission.sector}.`);
  for (const line of mission.tacticalProtocol.slice(0, 2)) {
    await pushAlert("info", view.tick, line);
  }

  async function handleFireAt(x: number, y: number): Promise<void> {
    scene.addProjectile({ x, y });
    const outcome = await fireAt(x, y);
    if (outcome.killed) {
      await pushAlert("info", view.tick, outcome.summary);
      void audio.playTone(theme.audio.killConfirmHz, 120, { type: "triangle", gain: 0.15 });
      scene.addExplosion(x, y, "kill");
    } else if (outcome.hit) {
      await pushAlert("info", view.tick, outcome.summary);
      void audio.playTone(theme.audio.hitHz, 80, { type: "triangle", gain: 0.12 });
      scene.addExplosion(x, y, "hit");
    } else {
      await pushAlert("warning", view.tick, outcome.summary);
      void audio.playTone(theme.audio.missHz, 140, { type: "sawtooth", gain: 0.17 });
    }
  }

  const step = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      const now = performance.now();
      const selectionDirection = axisDirection(controls.getSelectionAxis());
      if (selectionDirection !== 0 && now - selectionLatchTime > 220) {
        view = await cycleTarget(selectionDirection);
        selectionLatchTime = now;
      }

      const firePressed = controls.getFirePressed();
      if (firePressed && !fireLatch) {
        const selected = view.contacts.find((contact) => contact.selected);
        if (selected) {
          await handleFireAt(selected.x, selected.y);
        } else {
          const outcome = await fireShot();
          await pushAlert("warning", view.tick, outcome.summary);
        }
      }
      fireLatch = firePressed;

      const mutePressed = controls.getMutePressed();
      if (mutePressed && !muteLatch) {
        profile = { ...profile, muted: !profile.muted };
        audio.setMuted(profile.muted);
        await saveOperatorProfile(profile);
        hud.updateProfile(profile);
        await pushAlert("info", view.tick, profile.muted ? "Audio muted." : "Audio restored.");
      }
      muteLatch = mutePressed;

      for (const target of controls.drainPointerTargets()) {
        await handleFireAt(target.x, target.y);
      }

      view = await tickMission(0.1);
      if (view.integrity < lastIntegrity) {
        await pushAlert("warning", view.tick, "Integrity damage - enemy breached defense perimeter.");
        void audio.playTone(theme.audio.integrityLossHz, 180, { type: "square", gain: 0.16 });
        scene.addExplosion(320, 320, "breach");
      }
      lastIntegrity = view.integrity;

      if (view.integrity <= theme.ui.criticalIntegrityThreshold && !criticalAlertRaised) {
        criticalAlertRaised = true;
        await pushAlert("critical", view.tick, "Defense integrity entering critical threshold.");
        void audio.playTone(theme.audio.criticalAlertHz, 260, { type: "square", gain: 0.2 });
      } else if (view.integrity > theme.ui.criticalIntegrityThreshold) {
        criticalAlertRaised = false;
      }

      if (view.mission_state === "FAILED" && !missionRecorded) {
        missionRecorded = true;
        profile = await recordMissionOutcome(profile, view);
        hud.updateProfile(profile);
        await pushAlert("critical", view.tick, "Mission failed. Reload to run a new operation.");
      }

      hud.updateMission(view);
      scene.render(view);
      hud.setStatus(`${view.mission_state} - score ${view.score} - integrity ${view.integrity}`);
    } catch (error) {
      hud.setAlert(`Simulation error: ${String(error)}`);
    } finally {
      inFlight = false;
    }
  };

  const timer = setInterval(() => {
    void step();
  }, 100);

  return () => {
    clearInterval(timer);
    controls.dispose();
    scene.dispose();
  };
}
