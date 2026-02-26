import { describe, expect, test } from "bun:test";
import { createAssetLoader } from "./assets";

describe("webtau/assets", () => {
  test("loads and caches json assets", async () => {
    let fetchCalls = 0;
    const loader = createAssetLoader({
      fetchImpl: async () => {
        fetchCalls++;
        return new Response(JSON.stringify({ speed: 2 }), { status: 200 });
      },
    });

    const first = await loader.loadJson<{ speed: number }>("/assets/config.json");
    const second = await loader.loadJson<{ speed: number }>("/assets/config.json");

    expect(first).toEqual({ speed: 2 });
    expect(second).toEqual({ speed: 2 });
    expect(fetchCalls).toBe(1);

    loader.clear();
    await loader.loadJson<{ speed: number }>("/assets/config.json");
    expect(fetchCalls).toBe(2);
  });

  test("throws on non-ok responses", async () => {
    const loader = createAssetLoader({
      fetchImpl: async () => new Response("missing", { status: 404 }),
    });

    await expect(loader.loadText("/missing.txt")).rejects.toThrow("HTTP 404");
  });

  test("loads images with injected image factory", async () => {
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = "";

      set src(value: string) {
        this._src = value;
        queueMicrotask(() => {
          this.onload?.();
        });
      }

      get src(): string {
        return this._src;
      }
    }

    const loader = createAssetLoader({
      imageFactory: () => new FakeImage() as unknown as HTMLImageElement,
    });

    const image = await loader.loadImage("/assets/paddle.png");
    expect((image as unknown as { src: string }).src).toBe("/assets/paddle.png");
  });
});
