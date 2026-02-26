/**
 * webtau/dialog — Web shim for @tauri-apps/api/dialog.
 *
 * Uses HTML <dialog> when available, with safe browser fallbacks.
 */

export interface DialogFilter {
  name?: string;
  extensions: string[];
}

export interface OpenDialogOptions {
  title?: string;
  multiple?: boolean;
  directory?: boolean;
  filters?: DialogFilter[];
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
}

export interface MessageDialogOptions {
  title?: string;
  okLabel?: string;
  cancelLabel?: string;
}

interface DialogChoice {
  value: string;
  label: string;
}

function hasDom(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof document.createElement === "function" &&
    !!document.body
  );
}

function hasHtmlDialog(): boolean {
  if (!hasDom()) return false;
  try {
    const el = document.createElement("dialog") as HTMLDialogElement;
    return typeof el.showModal === "function";
  } catch {
    return false;
  }
}

function fallbackAlert(messageText: string): void {
  if (typeof globalThis.alert === "function") {
    globalThis.alert(messageText);
  } else {
    console.info(`[webtau/dialog] ${messageText}`);
  }
}

function fallbackConfirm(messageText: string): boolean {
  if (typeof globalThis.confirm === "function") {
    return globalThis.confirm(messageText);
  }
  return true;
}

function fallbackPrompt(messageText: string, value: string): string | null {
  if (typeof globalThis.prompt === "function") {
    return globalThis.prompt(messageText, value);
  }
  return value || null;
}

async function showChoiceDialog(
  messageText: string,
  options: MessageDialogOptions,
  choices: DialogChoice[],
): Promise<string> {
  if (!hasHtmlDialog()) {
    if (choices.length === 1) {
      fallbackAlert(messageText);
      return choices[0].value;
    }
    return fallbackConfirm(messageText) ? choices[0].value : choices[1].value;
  }

  return new Promise((resolve) => {
    const dialog = document.createElement("dialog") as HTMLDialogElement;
    dialog.style.padding = "1rem";
    dialog.style.border = "1px solid #666";
    dialog.style.borderRadius = "0.5rem";
    dialog.style.maxWidth = "min(90vw, 28rem)";

    const title = document.createElement("h3");
    title.textContent = options.title ?? "Dialog";
    title.style.margin = "0 0 0.75rem 0";
    dialog.appendChild(title);

    const body = document.createElement("p");
    body.textContent = messageText;
    body.style.margin = "0 0 1rem 0";
    body.style.whiteSpace = "pre-wrap";
    dialog.appendChild(body);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.justifyContent = "flex-end";
    actions.style.gap = "0.5rem";

    for (const choice of choices) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = choice.label;
      button.addEventListener("click", () => {
        dialog.returnValue = choice.value;
        dialog.close(choice.value);
      });
      actions.appendChild(button);
    }

    dialog.appendChild(actions);
    document.body.appendChild(dialog);

    const cleanup = () => {
      dialog.removeEventListener("close", onClose);
      dialog.remove();
    };

    const onClose = () => {
      const value = dialog.returnValue || choices[choices.length - 1].value;
      cleanup();
      resolve(value);
    };

    dialog.addEventListener("close", onClose);
    dialog.showModal();
  });
}

async function showInputDialog(
  messageText: string,
  options: SaveDialogOptions,
): Promise<string | null> {
  if (!hasHtmlDialog()) {
    return fallbackPrompt(messageText, options.defaultPath ?? "");
  }

  return new Promise((resolve) => {
    const dialog = document.createElement("dialog") as HTMLDialogElement;
    dialog.style.padding = "1rem";
    dialog.style.border = "1px solid #666";
    dialog.style.borderRadius = "0.5rem";
    dialog.style.maxWidth = "min(90vw, 28rem)";

    const title = document.createElement("h3");
    title.textContent = options.title ?? "Save";
    title.style.margin = "0 0 0.75rem 0";
    dialog.appendChild(title);

    const body = document.createElement("p");
    body.textContent = messageText;
    body.style.margin = "0 0 0.75rem 0";
    dialog.appendChild(body);

    const input = document.createElement("input");
    input.type = "text";
    input.value = options.defaultPath ?? "";
    input.style.width = "100%";
    input.style.marginBottom = "1rem";
    dialog.appendChild(input);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.justifyContent = "flex-end";
    actions.style.gap = "0.5rem";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      dialog.returnValue = "cancel";
      dialog.close("cancel");
    });

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", () => {
      dialog.returnValue = "save";
      dialog.close("save");
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    dialog.appendChild(actions);
    document.body.appendChild(dialog);

    const cleanup = () => {
      dialog.removeEventListener("close", onClose);
      dialog.remove();
    };

    const onClose = () => {
      const accepted = dialog.returnValue === "save";
      const value = input.value.trim();
      cleanup();
      resolve(accepted && value ? value : null);
    };

    dialog.addEventListener("close", onClose);
    dialog.showModal();
    input.focus();
    input.select();
  });
}

function filterToAccept(filters: DialogFilter[] | undefined): string | undefined {
  if (!filters || filters.length === 0) return undefined;
  const extensions = filters.flatMap((filter) => filter.extensions || []);
  if (extensions.length === 0) return undefined;
  return extensions.map((ext) => `.${ext.replace(/^\./, "")}`).join(",");
}

export async function message(
  messageText: string,
  options: MessageDialogOptions = {},
): Promise<void> {
  await showChoiceDialog(messageText, options, [
    { value: "ok", label: options.okLabel ?? "OK" },
  ]);
}

export async function ask(
  messageText: string,
  options: MessageDialogOptions = {},
): Promise<boolean> {
  const value = await showChoiceDialog(messageText, options, [
    { value: "ok", label: options.okLabel ?? "OK" },
    { value: "cancel", label: options.cancelLabel ?? "Cancel" },
  ]);
  return value === "ok";
}

export async function confirm(
  messageText: string,
  options: MessageDialogOptions = {},
): Promise<boolean> {
  return ask(messageText, options);
}

export async function open(
  options: OpenDialogOptions = {},
): Promise<string | string[] | null> {
  if (!hasDom()) return null;

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.style.display = "none";
    input.multiple = !!options.multiple;

    if (options.directory) {
      // Non-standard but widely supported by Chromium/WebKit.
      (input as HTMLInputElement & { webkitdirectory?: boolean }).webkitdirectory = true;
    }

    const accept = filterToAccept(options.filters);
    if (accept) input.accept = accept;

    const cleanup = () => {
      input.removeEventListener("change", onChange);
      input.remove();
    };

    const onChange = () => {
      const files = input.files ? Array.from(input.files) : [];
      cleanup();
      if (files.length === 0) {
        resolve(null);
        return;
      }
      const values = files.map((file) => {
        const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
        return rel || file.name;
      });
      resolve(options.multiple ? values : values[0]);
    };

    input.addEventListener("change", onChange);
    document.body.appendChild(input);
    input.click();
  });
}

export async function save(options: SaveDialogOptions = {}): Promise<string | null> {
  return showInputDialog("Select a file path to save.", options);
}
