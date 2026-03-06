type WgpuReadyEvent = CustomEvent<{ id: number }>;

interface HybridWgpuTagElement extends HTMLElement {
  transparent: boolean;
  passthroughEnabled: boolean;
  toggleTransparent(value?: boolean): void;
  togglePassthrough(value?: boolean): void;
  toggleHidden(value?: boolean): void;
  syncDimensions(force?: boolean): void;
  runTest(): void;
  on(event: "ready", listener: (event: WgpuReadyEvent) => void): void;
  off(event: "ready", listener: (event: WgpuReadyEvent) => void): void;
}

interface HybridShowcaseHandle {
  renderMode: "hybrid";
  destroy(): void;
}

function isHybridTagReady(tag: Element | null): tag is HybridWgpuTagElement {
  return !!tag
    && typeof (tag as Partial<HybridWgpuTagElement>).runTest === "function"
    && typeof (tag as Partial<HybridWgpuTagElement>).toggleTransparent === "function";
}

export function setupElectrobunHybridWgpu(): HybridShowcaseHandle | null {
  const panel = document.getElementById("hybrid-panel") as HTMLElement | null;
  const tag = document.querySelector("electrobun-wgpu");
  const statusEl = document.getElementById("hybrid-status");
  const rerunButton = document.getElementById("hybrid-run");
  const transparentButton = document.getElementById("hybrid-transparent");
  const passthroughButton = document.getElementById("hybrid-passthrough");
  const maskButton = document.getElementById("hybrid-mask");
  const mask = document.getElementById("wgpu-mask");

  if (
    !panel
    || !statusEl
    || !rerunButton
    || !transparentButton
    || !passthroughButton
    || !maskButton
    || !mask
  ) {
    if (panel) {
      panel.hidden = true;
    }
    return null;
  }

  if (!isHybridTagReady(tag)) {
    panel.hidden = true;
    return null;
  }

  const wgpuTag = tag;
  panel.hidden = false;

  let transparent = false;
  let passthrough = false;
  let maskVisible = true;

  function updateButtonLabels() {
    transparentButton!.textContent = transparent ? "Opaque surface" : "Transparent surface";
    passthroughButton!.textContent = passthrough ? "Capture clicks" : "Passthrough clicks";
    maskButton!.textContent = maskVisible ? "Hide HTML mask" : "Show HTML mask";
  }

  function syncMaskLayout() {
    mask!.hidden = !maskVisible;
    wgpuTag.syncDimensions(true);
  }

  const onReady = (event: WgpuReadyEvent) => {
    statusEl.textContent = `Hybrid WGPU view ready (#${event.detail.id})`;
    wgpuTag.runTest();
  };

  wgpuTag.on("ready", onReady);

  const handleRerun = () => {
    statusEl.textContent = "Running native WGPU test renderer";
    wgpuTag.runTest();
  };

  const handleTransparent = () => {
    transparent = !transparent;
    wgpuTag.toggleTransparent(transparent);
    updateButtonLabels();
    statusEl.textContent = transparent
      ? "Surface transparency enabled"
      : "Surface opacity restored";
  };

  const handlePassthrough = () => {
    passthrough = !passthrough;
    wgpuTag.togglePassthrough(passthrough);
    updateButtonLabels();
    statusEl.textContent = passthrough
      ? "Native surface click passthrough enabled"
      : "Native surface clicks restored";
  };

  const handleMask = () => {
    maskVisible = !maskVisible;
    syncMaskLayout();
    updateButtonLabels();
    statusEl.textContent = maskVisible
      ? "HTML mask applied over the native surface"
      : "HTML mask removed from the native surface";
  };

  rerunButton.addEventListener("click", handleRerun);
  transparentButton.addEventListener("click", handleTransparent);
  passthroughButton.addEventListener("click", handlePassthrough);
  maskButton.addEventListener("click", handleMask);

  updateButtonLabels();
  syncMaskLayout();
  statusEl.textContent = "Waiting for Electrobun WGPU surface";

  return {
    renderMode: "hybrid",
    destroy() {
      wgpuTag.off("ready", onReady);
      rerunButton.removeEventListener("click", handleRerun);
      transparentButton.removeEventListener("click", handleTransparent);
      passthroughButton.removeEventListener("click", handlePassthrough);
      maskButton.removeEventListener("click", handleMask);
    },
  };
}

export async function setupElectrobunHybridWgpuWhenReady(): Promise<HybridShowcaseHandle | null> {
  const initial = setupElectrobunHybridWgpu();
  if (initial) {
    return initial;
  }

  if (
    typeof customElements === "undefined"
    || !document.querySelector("electrobun-wgpu")
    || typeof customElements.whenDefined !== "function"
  ) {
    return null;
  }

  await customElements.whenDefined("electrobun-wgpu");
  return setupElectrobunHybridWgpu();
}
