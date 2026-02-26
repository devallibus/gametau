import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { ask, confirm, message, open, save } from "./dialog";

type MutableGlobal = {
  alert?: (message?: string) => void;
  confirm?: (message?: string) => boolean;
  prompt?: (message?: string, defaultValue?: string) => string | null;
  document?: unknown;
};

const originalAlert = globalThis.alert;
const originalConfirm = globalThis.confirm;
const originalPrompt = globalThis.prompt;
const originalDocument = (globalThis as MutableGlobal).document;

beforeEach(() => {
  (globalThis as MutableGlobal).document = undefined;
});

afterEach(() => {
  globalThis.alert = originalAlert;
  globalThis.confirm = originalConfirm;
  globalThis.prompt = originalPrompt;
  (globalThis as MutableGlobal).document = originalDocument;
});

describe("webtau/dialog", () => {
  test("ask and confirm use confirm fallback when HTML dialog is unavailable", async () => {
    let calls = 0;
    globalThis.confirm = () => {
      calls++;
      return true;
    };

    expect(await ask("Continue?")).toBe(true);
    expect(await confirm("Are you sure?")).toBe(true);
    expect(calls).toBe(2);
  });

  test("message uses alert fallback", async () => {
    let shown = "";
    globalThis.alert = (msg?: string) => {
      shown = msg ?? "";
    };

    await message("Saved");
    expect(shown).toBe("Saved");
  });

  test("save uses prompt fallback", async () => {
    globalThis.prompt = (_msg?: string, defaultValue?: string) => `${defaultValue ?? "file"}.txt`;
    const result = await save({ defaultPath: "snapshot" });
    expect(result).toBe("snapshot.txt");
  });

  test("open returns null without DOM access", async () => {
    const result = await open({ multiple: true });
    expect(result).toBeNull();
  });
});
