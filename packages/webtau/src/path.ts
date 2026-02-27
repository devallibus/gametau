/**
 * webtau/path — Web shim for @tauri-apps/api/path.
 *
 * Provides virtual directory resolvers and POSIX-style path utilities.
 * On the web there is no real filesystem, so directory functions return
 * virtual paths under `/app/*` that pair naturally with the IndexedDB-backed
 * `webtau/fs` module. Path manipulation functions use `/` as the separator.
 */

// ── Path separator ──

/** Path separator for the current platform. Always `/` on web. */
export function sep(): string {
  return "/";
}

/** PATH-list separator for the current platform. Always `":"` on web (POSIX). */
export function delimiter(): string {
  return ":";
}

// ── Directory resolvers ──
// Virtual paths that map to logical locations. Consumers can use these
// with webtau/fs (IndexedDB-backed) for persistent storage on the web.

/** Application data directory. */
export async function appDataDir(): Promise<string> {
  return "/app/data";
}

/** Application local data directory. */
export async function appLocalDataDir(): Promise<string> {
  return "/app/local-data";
}

/** Application config directory. */
export async function appConfigDir(): Promise<string> {
  return "/app/config";
}

/** Application cache directory. */
export async function appCacheDir(): Promise<string> {
  return "/app/cache";
}

/** Application log directory. */
export async function appLogDir(): Promise<string> {
  return "/app/log";
}

/** Desktop directory. Unsupported on web — returns virtual path. */
export async function desktopDir(): Promise<string> {
  return "/app/desktop";
}

/** Documents directory. Unsupported on web — returns virtual path. */
export async function documentDir(): Promise<string> {
  return "/app/documents";
}

/** Downloads directory. Unsupported on web — returns virtual path. */
export async function downloadDir(): Promise<string> {
  return "/app/downloads";
}

/** Home directory. */
export async function homeDir(): Promise<string> {
  return "/app/home";
}

/** Audio directory. Unsupported on web — returns virtual path. */
export async function audioDir(): Promise<string> {
  return "/app/audio";
}

/** Picture directory. Unsupported on web — returns virtual path. */
export async function pictureDir(): Promise<string> {
  return "/app/pictures";
}

/** Public directory. Unsupported on web — returns virtual path. */
export async function publicDir(): Promise<string> {
  return "/app/public";
}

/** Video directory. Unsupported on web — returns virtual path. */
export async function videoDir(): Promise<string> {
  return "/app/videos";
}

/** Resource directory (bundled assets). */
export async function resourceDir(): Promise<string> {
  return "/app/resources";
}

/** Temporary directory. */
export async function tempDir(): Promise<string> {
  return "/app/temp";
}

/** System cache directory. Unsupported on web — returns virtual path. */
export async function cacheDir(): Promise<string> {
  return "/app/cache";
}

/** System config directory. Unsupported on web — returns virtual path. */
export async function configDir(): Promise<string> {
  return "/app/config";
}

/** System data directory. Unsupported on web — returns virtual path. */
export async function dataDir(): Promise<string> {
  return "/app/data";
}

/** System local data directory. Unsupported on web — returns virtual path. */
export async function localDataDir(): Promise<string> {
  return "/app/local-data";
}

// ── Path utilities ──
// POSIX-style path manipulation. These are synchronous helpers that
// mirror the Tauri path API's async signatures for compatibility.

/**
 * Returns the last component of a path.
 *
 * ```ts
 * basename("/app/data/save.json") // "save.json"
 * basename("/app/data/save.json", ".json") // "save"
 * ```
 */
export async function basename(path: string, ext?: string): Promise<string> {
  const segments = path.replace(/\/+$/, "").split("/");
  let name = segments[segments.length - 1] || "";
  if (ext && name.endsWith(ext)) {
    name = name.slice(0, -ext.length);
  }
  return name;
}

/**
 * Returns the directory portion of a path.
 *
 * ```ts
 * dirname("/app/data/save.json") // "/app/data"
 * ```
 */
export async function dirname(path: string): Promise<string> {
  const segments = path.replace(/\/+$/, "").split("/");
  segments.pop();
  return segments.join("/") || "/";
}

/**
 * Returns the extension of a path, including the leading dot.
 *
 * ```ts
 * extname("/app/data/save.json") // ".json"
 * extname("readme") // ""
 * ```
 */
export async function extname(path: string): Promise<string> {
  const base = path.replace(/\/+$/, "").split("/").pop() || "";
  const dotIndex = base.lastIndexOf(".");
  if (dotIndex <= 0) return "";
  return base.slice(dotIndex);
}

/**
 * Joins path segments with the platform separator.
 *
 * ```ts
 * join("/app", "data", "save.json") // "/app/data/save.json"
 * ```
 */
export async function join(...paths: string[]): Promise<string> {
  return normalizePath(paths.join("/"));
}

/**
 * Normalizes a path, resolving `.` and `..` segments and collapsing
 * repeated separators.
 *
 * ```ts
 * normalize("/app/data/../config/./settings.json") // "/app/config/settings.json"
 * ```
 */
export async function normalize(path: string): Promise<string> {
  return normalizePath(path);
}

/**
 * Resolves a sequence of paths into an absolute path.
 * If the last absolute path wins; relative segments are appended.
 *
 * ```ts
 * resolve("/app", "data", "save.json") // "/app/data/save.json"
 * resolve("data", "/other", "file.txt") // "/other/file.txt"
 * ```
 */
export async function resolve(...paths: string[]): Promise<string> {
  let resolved = "";
  for (let i = paths.length - 1; i >= 0; i--) {
    resolved = paths[i] + (resolved ? `/${resolved}` : "");
    if (paths[i].startsWith("/")) break;
  }
  return normalizePath(resolved);
}

/**
 * Returns `true` if the path is absolute (starts with `/`).
 */
export async function isAbsolute(path: string): Promise<boolean> {
  return path.startsWith("/");
}

// ── Internal helpers ──

function normalizePath(path: string): string {
  const isAbs = path.startsWith("/");
  const segments = path.split("/").filter(Boolean);
  const result: string[] = [];

  for (const segment of segments) {
    if (segment === ".") continue;
    if (segment === "..") {
      if (result.length > 0 && result[result.length - 1] !== "..") {
        result.pop();
      } else if (!isAbs) {
        result.push("..");
      }
    } else {
      result.push(segment);
    }
  }

  const normalized = result.join("/");
  return isAbs ? `/${normalized}` : normalized || ".";
}
