import { createCommsService } from "./comms";
import {
  DEFAULT_RUNTIME_SETTINGS,
  type AlertLevel,
  type AlertMessage,
  type RuntimeSettings,
  type SessionSnapshot,
  type ServiceLayer,
} from "./contracts";
import { createSessionService } from "./session";
import { createSettingsService } from "./settings";

export * from "./backend";
export {
  DEFAULT_RUNTIME_SETTINGS,
  type RuntimeSettings,
  type AlertLevel,
  type AlertMessage,
  type SessionSnapshot,
};

export async function createServiceLayer(): Promise<ServiceLayer> {
  const settings = createSettingsService();
  const resolvedSettings = await settings.load();
  const comms = createCommsService(resolvedSettings.commsChannel);
  const session = createSessionService();
  return { settings, comms, session };
}
