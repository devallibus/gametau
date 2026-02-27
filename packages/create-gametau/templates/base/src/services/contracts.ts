import type { WorldView } from "./backend";

export type AlertLevel = "info" | "warning" | "critical";

export interface AlertMessage {
  level: AlertLevel;
  source: string;
  message: string;
  timestamp: string;
}

export interface RuntimeSettings {
  tickRateHz: number;
  autoSaveEveryTicks: number;
  commsChannel: string;
}

export const DEFAULT_RUNTIME_SETTINGS: RuntimeSettings = {
  tickRateHz: 10,
  autoSaveEveryTicks: 10,
  commsChannel: "ops",
};

export interface SessionSnapshot extends WorldView {
  savedAt: string;
}

export interface SettingsService {
  load(): Promise<RuntimeSettings>;
  save(next: Partial<RuntimeSettings>): Promise<RuntimeSettings>;
}

export interface SessionService {
  loadLastSnapshot(): Promise<SessionSnapshot | null>;
  saveSnapshot(view: WorldView): Promise<void>;
}

export interface CommsService {
  readonly channel: string;
  publish(input: Omit<AlertMessage, "timestamp"> & { timestamp?: string }): Promise<void>;
  subscribe(handler: (message: AlertMessage) => void): Promise<() => void>;
}

export interface ServiceLayer {
  settings: SettingsService;
  session: SessionService;
  comms: CommsService;
}
