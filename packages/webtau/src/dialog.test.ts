import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { ask, confirm, message, open, save, setDialogAdapter } from "./dialog";

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
  setDialogAdapter(null);
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

// ---------------------------------------------------------------------------
// DialogAdapter — adapter override
// ---------------------------------------------------------------------------

describe("setDialogAdapter", () => {
  test("adapter overrides message", async () => {
    let captured = "";
    setDialogAdapter({
      message: async (text) => { captured = text; },
      ask: async () => true,
      open: async () => null,
      save: async () => null,
    });

    await message("Adapter message");
    expect(captured).toBe("Adapter message");
  });

  test("adapter overrides ask and confirm", async () => {
    setDialogAdapter({
      message: async () => {},
      ask: async (_text, opts) => opts?.okLabel === "Yes",
      open: async () => null,
      save: async () => null,
    });

    expect(await ask("Q?", { okLabel: "Yes" })).toBe(true);
    expect(await ask("Q?", { okLabel: "Nope" })).toBe(false);
    expect(await confirm("C?", { okLabel: "Yes" })).toBe(true);
  });

  test("adapter overrides open and save", async () => {
    setDialogAdapter({
      message: async () => {},
      ask: async () => true,
      open: async () => ["/file1.txt", "/file2.txt"],
      save: async (opts) => opts?.defaultPath ?? "default.txt",
    });

    expect(await open({ multiple: true })).toEqual(["/file1.txt", "/file2.txt"]);
    expect(await save({ defaultPath: "save.json" })).toBe("save.json");
  });

  test("clearing adapter restores default behavior", async () => {
    setDialogAdapter({
      message: async () => {},
      ask: async () => false,
      open: async () => null,
      save: async () => null,
    });

    // Adapter returns false for ask
    expect(await ask("Q?")).toBe(false);

    setDialogAdapter(null);

    // Default fallback: confirm returns true
    globalThis.confirm = () => true;
    expect(await ask("Q?")).toBe(true);
  });
});
