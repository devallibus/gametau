import { registerProvider, type CoreProvider } from "webtau";

type InvokeArgs = Record<string, unknown> | undefined;

interface ElectrobunBridge {
  invoke<T = unknown>(command: string, args?: InvokeArgs): Promise<T>;
  convertFileSrc?: (filePath: string, protocol?: string) => string;
}

declare global {
  interface Window {
    __ELECTROBUN__?: ElectrobunBridge;
  }
}

/**
 * Registers a webtau runtime provider when an Electrobun bridge is exposed
 * on window.__ELECTROBUN__. Returns true when provider registration succeeds.
 */
export function registerElectrobunProviderIfAvailable(): boolean {
  if (typeof window === "undefined") return false;

  const bridge = window.__ELECTROBUN__;
  if (!bridge || typeof bridge.invoke !== "function") {
    return false;
  }

  const provider: CoreProvider = {
    id: "electrobun",
    invoke: (command, args) => bridge.invoke(command, args),
    convertFileSrc: (filePath, protocol) => (
      bridge.convertFileSrc ? bridge.convertFileSrc(filePath, protocol) : filePath
    ),
  };

  registerProvider(provider);
  return true;
}
