/**
 * webtau/window — Web shim for @tauri-apps/api/window.
 *
 * Provides getCurrentWindow() returning a WebWindow that implements
 * the subset of Tauri's Window API that games typically use,
 * backed by the Fullscreen API, document.title, and screen.*.
 *
 * An optional WindowAdapter can be set via `setWindowAdapter()` to
 * route all window operations through an alternative runtime.
 */

import { type LogicalSize, PhysicalPosition, PhysicalSize } from "./dpi";
import type { WindowAdapter } from "./provider";

let windowAdapter: WindowAdapter | null = null;

/**
 * Set (or clear) a window adapter that overrides all WebWindow methods.
 * Pass `null` to restore default browser-based behavior.
 */
export function setWindowAdapter(adapter: WindowAdapter | null): void {
  windowAdapter = adapter;
}

interface Monitor {
  name: string | null;
  size: PhysicalSize;
  position: PhysicalPosition;
  scaleFactor: number;
}

class WebWindow {
  // ── Fullscreen ──

  async isFullscreen(): Promise<boolean> {
    if (windowAdapter) return windowAdapter.isFullscreen();
    return !!document.fullscreenElement;
  }

  async setFullscreen(fullscreen: boolean): Promise<void> {
    if (windowAdapter) return windowAdapter.setFullscreen(fullscreen);
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
    if (windowAdapter) {
      const s = await windowAdapter.innerSize();
      return new PhysicalSize(s.width, s.height);
    }
    return new PhysicalSize(window.innerWidth, window.innerHeight);
  }

  async outerSize(): Promise<PhysicalSize> {
    if (windowAdapter) {
      const s = await windowAdapter.outerSize();
      return new PhysicalSize(s.width, s.height);
    }
    return new PhysicalSize(window.outerWidth, window.outerHeight);
  }

  async setSize(size: LogicalSize | PhysicalSize): Promise<void> {
    if (windowAdapter) return windowAdapter.setSize(size);
    if (size.type === "Logical") {
      window.resizeTo(size.width, size.height);
    } else {
      const scale = window.devicePixelRatio;
      window.resizeTo(size.width / scale, size.height / scale);
    }
  }

  // ── Minimize / Maximize (limited on web) ──

  async maximize(): Promise<void> {
    if (windowAdapter) return windowAdapter.maximize();
    // Best approximation: go fullscreen
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  }

  async isMaximized(): Promise<boolean> {
    if (windowAdapter) return windowAdapter.isMaximized();
    return !!document.fullscreenElement;
  }

  // ── Title ──

  async title(): Promise<string> {
    if (windowAdapter) return windowAdapter.title();
    return document.title;
  }

  async setTitle(title: string): Promise<void> {
    if (windowAdapter) return windowAdapter.setTitle(title);
    document.title = title;
  }

  // ── Close / Minimize / Show / Hide ──

  /** Best-effort close — browsers may ignore this for non-script-opened windows. */
  async close(): Promise<void> {
    if (windowAdapter) return windowAdapter.close();
    window.close();
  }

  /** No-op on web — browsers don't expose minimize. */
  async minimize(): Promise<void> {
    if (windowAdapter) return windowAdapter.minimize();
  }

  /** No-op on web — browsers don't expose unminimize. */
  async unminimize(): Promise<void> {
    if (windowAdapter) return windowAdapter.unminimize();
  }

  /** No-op on web — window is always visible in a browser tab. */
  async show(): Promise<void> {
    if (windowAdapter) return windowAdapter.show();
  }

  /** No-op on web — cannot hide a browser tab programmatically. */
  async hide(): Promise<void> {
    if (windowAdapter) return windowAdapter.hide();
  }

  // ── Decorations (no-op on web) ──

  async setDecorations(_decorations: boolean): Promise<void> {
    if (windowAdapter) return windowAdapter.setDecorations(_decorations);
    // Browser chrome is not controllable from JS.
    // No-op to maintain API compatibility.
  }

  // ── Position ──

  async center(): Promise<void> {
    if (windowAdapter) return windowAdapter.center();
    const left = (screen.width - window.outerWidth) / 2;
    const top = (screen.height - window.outerHeight) / 2;
    window.moveTo(left, top);
  }

  // ── Monitor ──

  async currentMonitor(): Promise<Monitor | null> {
    if (windowAdapter) {
      const m = await windowAdapter.currentMonitor();
      if (!m) return null;
      return {
        name: m.name,
        size: new PhysicalSize(m.size.width, m.size.height),
        position: new PhysicalPosition(m.position.x, m.position.y),
        scaleFactor: m.scaleFactor,
      };
    }
    return {
      name: null,
      size: new PhysicalSize(screen.width, screen.height),
      position: new PhysicalPosition(0, 0),
      scaleFactor: window.devicePixelRatio,
    };
  }

  async scaleFactor(): Promise<number> {
    if (windowAdapter) return windowAdapter.scaleFactor();
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
