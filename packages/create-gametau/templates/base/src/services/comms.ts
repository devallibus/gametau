import { emit, listen } from "webtau/event";
import type { AlertMessage, CommsService } from "./contracts";

const COMMS_NAMESPACE = "gametau:comms";

function eventNameFor(channel: string): string {
  return `${COMMS_NAMESPACE}:${channel}`;
}

export function createCommsService(channel: string): CommsService {
  const eventName = eventNameFor(channel);

  return {
    channel,

    async publish(input): Promise<void> {
      const payload: AlertMessage = {
        level: input.level,
        source: input.source,
        message: input.message,
        timestamp: input.timestamp ?? new Date().toISOString(),
      };
      await emit(eventName, payload);
    },

    async subscribe(handler): Promise<() => void> {
      return listen<AlertMessage>(eventName, ({ payload }) => {
        handler(payload);
      });
    },
  };
}
