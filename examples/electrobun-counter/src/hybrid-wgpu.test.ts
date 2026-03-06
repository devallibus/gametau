import { afterEach, describe, expect, test } from "bun:test";
import { setupElectrobunHybridWgpu, setupElectrobunHybridWgpuWhenReady } from "./hybrid-wgpu";

const previousDocument = globalThis.document;
const previousCustomElements = globalThis.customElements;

afterEach(() => {
  if (previousDocument === undefined) {
    delete (globalThis as { document?: unknown }).document;
  } else {
    (globalThis as { document?: unknown }).document = previousDocument;
  }

  if (previousCustomElements === undefined) {
    delete (globalThis as { customElements?: unknown }).customElements;
  } else {
    (globalThis as { customElements?: unknown }).customElements = previousCustomElements;
  }
});

describe("setupElectrobunHybridWgpu", () => {
  test("returns null when no upgraded WGPU tag is present", async () => {
    (globalThis as { document?: unknown }).document = {
      getElementById: (id: string) => (
        id === "hybrid-panel" ? { hidden: false } : null
      ),
      querySelector: () => null,
    };
    (globalThis as { customElements?: unknown }).customElements = {
      whenDefined: async () => {},
    };

    expect(setupElectrobunHybridWgpu()).toBeNull();
    await expect(setupElectrobunHybridWgpuWhenReady()).resolves.toBeNull();
  });
});
