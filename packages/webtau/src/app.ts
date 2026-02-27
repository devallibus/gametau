/**
 * webtau/app — Web shim for @tauri-apps/api/app.
 *
 * Provides getName(), getVersion(), getTauriVersion(), show(), and hide().
 * In web mode, name and version are read from a configurable source
 * (defaults to document.title / "0.0.0"). show() and hide() are no-ops
 * since browser tabs cannot be hidden programmatically.
 */

let appName: string | null = null;
let appVersion: string | null = null;

/**
 * Override the app name returned by `getName()`.
 * Useful for setting metadata early in your web entry point.
 * Pass `null` to reset to the default fallback behavior.
 *
 * ```ts
 * import { setAppName } from "webtau/app";
 * setAppName("My Game");
 * setAppName(null); // reset
 * ```
 */
export function setAppName(name: string | null): void {
  appName = name;
}

/**
 * Override the app version returned by `getVersion()`.
 * Pass `null` to reset to the default fallback behavior.
 *
 * ```ts
 * import { setAppVersion } from "webtau/app";
 * setAppVersion("1.2.0");
 * setAppVersion(null); // reset
 * ```
 */
export function setAppVersion(version: string | null): void {
  appVersion = version;
}

/**
 * Returns the application name.
 *
 * Web fallback: returns the value set via `setAppName()`, or
 * `document.title` if available, or `"gametau-app"`.
 */
export async function getName(): Promise<string> {
  if (appName !== null) return appName;
  if (typeof document !== "undefined" && document.title) {
    return document.title;
  }
  return "gametau-app";
}

/**
 * Returns the application version.
 *
 * Web fallback: returns the value set via `setAppVersion()`,
 * or `"0.0.0"`.
 */
export async function getVersion(): Promise<string> {
  if (appVersion !== null) return appVersion;
  return "0.0.0";
}

/**
 * Returns the Tauri version.
 *
 * Web fallback: always returns `"web"` since there is no Tauri runtime.
 * Callers can use this to distinguish desktop vs web at runtime.
 */
export async function getTauriVersion(): Promise<string> {
  return "web";
}

/**
 * Shows the application window.
 *
 * No-op on web — browser tabs are always visible.
 */
export async function show(): Promise<void> {}

/**
 * Hides the application window.
 *
 * No-op on web — browser tabs cannot be hidden programmatically.
 */
export async function hide(): Promise<void> {}
