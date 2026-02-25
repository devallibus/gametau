/**
 * webtau/window — Web shim for @tauri-apps/api/window.
 *
 * Provides getCurrentWindow() returning a WebWindow that implements
 * the subset of Tauri's Window API that games typically use,
 * backed by the Fullscreen API, document.title, and screen.*.
 */

import { LogicalSize, PhysicalSize, PhysicalPosition } from "./dpi";

interface Monitor {
  name: string | null;
  size: PhysicalSize;
  position: PhysicalPosition;
  scaleFactor: number;
}

class WebWindow {
  // ── Fullscreen ──

  async isFullscreen(): Promise<boolean> {
    return !!document.fullscreenElement;
  }

  async setFullscreen(fullscreen: boolean): Promise<void> {
    if (fullscreen) {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } else {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    }
  }

  // ── Window size ──

  async innerSize(): Promise<PhysicalSize> {
    return new PhysicalSize(window.innerWidth, window.innerHeight);
  }

  async outerSize(): Promise<PhysicalSize> {
    return new PhysicalSize(window.outerWidth, window.outerHeight);
  }

  async setSize(size: LogicalSize | PhysicalSize): Promise<void> {
    if (size.type === "Logical") {
      window.resizeTo(size.width, size.height);
    } else {
      const scale = window.devicePixelRatio;
      window.resizeTo(size.width / scale, size.height / scale);
    }
  }

  // ── Minimize / Maximize (limited on web) ──

  async maximize(): Promise<void> {
    // Best approximation: go fullscreen
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  }

  async isMaximized(): Promise<boolean> {
    return !!document.fullscreenElement;
  }

  // ── Title ──

  async title(): Promise<string> {
    return document.title;
  }

  async setTitle(title: string): Promise<void> {
    document.title = title;
  }

  // ── Close / Minimize / Show / Hide ──

  /** Best-effort close — browsers may ignore this for non-script-opened windows. */
  async close(): Promise<void> {
    window.close();
  }

  /** No-op on web — browsers don't expose minimize. */
  async minimize(): Promise<void> {}

  /** No-op on web — browsers don't expose unminimize. */
  async unminimize(): Promise<void> {}

  /** No-op on web — window is always visible in a browser tab. */
  async show(): Promise<void> {}

  /** No-op on web — cannot hide a browser tab programmatically. */
  async hide(): Promise<void> {}

  // ── Decorations (no-op on web) ──

  async setDecorations(_decorations: boolean): Promise<void> {
    // Browser chrome is not controllable from JS.
    // No-op to maintain API compatibility.
  }

  // ── Position ──

  async center(): Promise<void> {
    const left = (screen.width - window.outerWidth) / 2;
    const top = (screen.height - window.outerHeight) / 2;
    window.moveTo(left, top);
  }

  // ── Monitor ──

  async currentMonitor(): Promise<Monitor | null> {
    return {
      name: null,
      size: new PhysicalSize(screen.width, screen.height),
      position: new PhysicalPosition(0, 0),
      scaleFactor: window.devicePixelRatio,
    };
  }

  async scaleFactor(): Promise<number> {
    return window.devicePixelRatio;
  }
}

let instance: WebWindow | null = null;

/**
 * Returns a WebWindow instance that shims Tauri's Window API
 * for web builds using browser-native APIs.
 */
export function getCurrentWindow(): WebWindow {
  if (!instance) {
    instance = new WebWindow();
  }
  return instance;
}
