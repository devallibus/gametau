import { emit, listen } from "webtau/event";

export type AlertLevel = "info" | "warning" | "critical";

export interface BattlestationAlert {
  level: AlertLevel;
  tick: number;
  message: string;
  createdAt: string;
}

const ALERT_EVENT = "battlestation:alert";

export async function publishAlert(input: Omit<BattlestationAlert, "createdAt">): Promise<void> {
  const payload: BattlestationAlert = {
    ...input,
    createdAt: new Date().toISOString(),
  };
  await emit(ALERT_EVENT, payload);
}

export async function subscribeAlerts(
  handler: (alert: BattlestationAlert) => void,
): Promise<() => void> {
  return listen<BattlestationAlert>(ALERT_EVENT, ({ payload }) => handler(payload));
}
