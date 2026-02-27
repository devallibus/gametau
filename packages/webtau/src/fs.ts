/**
 * webtau/fs — Web shim for @tauri-apps/api/fs.
 *
 * Uses IndexedDB when available, with an in-memory fallback for
 * non-browser test environments.
 */

type EntryKind = "file" | "dir";

interface StoredEntry {
  path: string;
  kind: EntryKind;
  text?: string;
  bytes?: ArrayBufferLike;
}

export interface ReadDirOptions {
  recursive?: boolean;
}

export interface CreateDirOptions {
  recursive?: boolean;
}

export interface RemoveOptions {
  recursive?: boolean;
}

export interface FsEntry {
  path: string;
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  children?: FsEntry[];
}

const DB_NAME = "webtau-fs";
const DB_VERSION = 1;
const STORE_NAME = "entries";

const memoryStore = new Map<string, StoredEntry>();
let dbPromise: Promise<IDBDatabase> | null = null;

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function normalizePath(path: string): string {
  const normalized = path
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  return normalized === "." ? "" : normalized;
}

function requirePath(path: string): string {
  const normalized = normalizePath(path);
  if (!normalized) {
    throw new Error("[webtau/fs] Path cannot be empty.");
  }
  return normalized;
}

function parentPath(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

function toUint8Array(data: Uint8Array | ArrayBuffer | number[] | string): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (Array.isArray(data)) return Uint8Array.from(data);
  return new TextEncoder().encode(data);
}

function cloneEntry(entry: StoredEntry): StoredEntry {
  if (entry.bytes) {
    return { ...entry, bytes: entry.bytes.slice(0) };
  }
  return { ...entry };
}

function asArrayBuffer(bytes: Uint8Array): ArrayBufferLike {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function openDb(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) {
    throw new Error("[webtau/fs] IndexedDB is not available.");
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "path" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("[webtau/fs] Failed to open IndexedDB."));
  });

  return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("[webtau/fs] IndexedDB request failed."));
  });
}

async function getEntry(path: string): Promise<StoredEntry | null> {
  if (!hasIndexedDb()) {
    const entry = memoryStore.get(path);
    return entry ? cloneEntry(entry) : null;
  }
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const result = await requestToPromise(store.get(path));
  return result ? cloneEntry(result as StoredEntry) : null;
}

async function putEntry(entry: StoredEntry): Promise<void> {
  const cloned = cloneEntry(entry);
  if (!hasIndexedDb()) {
    memoryStore.set(cloned.path, cloned);
    return;
  }
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await requestToPromise(store.put(cloned));
}

async function deleteEntry(path: string): Promise<void> {
  if (!hasIndexedDb()) {
    memoryStore.delete(path);
    return;
  }
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await requestToPromise(store.delete(path));
}

async function listEntries(): Promise<StoredEntry[]> {
  if (!hasIndexedDb()) {
    return Array.from(memoryStore.values()).map(cloneEntry);
  }
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const all = await requestToPromise(store.getAll());
  return (all as StoredEntry[]).map(cloneEntry);
}

async function ensureDirChain(path: string): Promise<void> {
  if (!path) return;
  const parts = path.split("/");
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const existing = await getEntry(current);
    if (existing?.kind === "file") {
      throw new Error(`[webtau/fs] "${current}" is a file, expected directory.`);
    }
    if (!existing) {
      await putEntry({ path: current, kind: "dir" });
    }
  }
}

function buildDirEntries(
  basePath: string,
  allEntries: StoredEntry[],
  recursive: boolean,
): FsEntry[] {
  const normalizedBase = normalizePath(basePath);
  const prefix = normalizedBase ? `${normalizedBase}/` : "";
  const childMap = new Map<string, FsEntry>();

  for (const entry of allEntries) {
    if (entry.path === normalizedBase) continue;

    if (normalizedBase && !entry.path.startsWith(prefix)) continue;
    const relative = normalizedBase ? entry.path.slice(prefix.length) : entry.path;
    if (!relative) continue;

    const segments = relative.split("/");
    const first = segments[0];
    const childPath = normalizedBase ? `${normalizedBase}/${first}` : first;
    const child = childMap.get(childPath);

    const isImmediate = segments.length === 1;
    const isDirectory = isImmediate ? entry.kind === "dir" : true;

    if (!child) {
      childMap.set(childPath, {
        path: childPath,
        name: first,
        isFile: !isDirectory,
        isDirectory,
      });
    } else if (isDirectory) {
      child.isDirectory = true;
      child.isFile = false;
    }
  }

  const entries = Array.from(childMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  if (!recursive) return entries;

  for (const entry of entries) {
    if (entry.isDirectory) {
      entry.children = buildDirEntries(entry.path, allEntries, true);
    }
  }
  return entries;
}

export async function writeTextFile(
  path: string,
  contents: string,
  _options?: unknown,
): Promise<void> {
  const normalized = requirePath(path);
  await ensureDirChain(parentPath(normalized));
  await putEntry({ path: normalized, kind: "file", text: contents });
}

export async function readTextFile(path: string, _options?: unknown): Promise<string> {
  const normalized = requirePath(path);
  const entry = await getEntry(normalized);
  if (!entry || entry.kind !== "file") {
    throw new Error(`[webtau/fs] File not found: ${normalized}`);
  }
  if (typeof entry.text === "string") return entry.text;
  if (entry.bytes) return new TextDecoder().decode(new Uint8Array(entry.bytes));
  return "";
}

export async function writeFile(
  path: string,
  contents: Uint8Array | ArrayBuffer | number[] | string,
  _options?: unknown,
): Promise<void> {
  const normalized = requirePath(path);
  await ensureDirChain(parentPath(normalized));
  const bytes = toUint8Array(contents);
  await putEntry({
    path: normalized,
    kind: "file",
    bytes: asArrayBuffer(bytes),
  });
}

export async function readFile(path: string, _options?: unknown): Promise<Uint8Array> {
  const normalized = requirePath(path);
  const entry = await getEntry(normalized);
  if (!entry || entry.kind !== "file") {
    throw new Error(`[webtau/fs] File not found: ${normalized}`);
  }
  if (entry.bytes) return new Uint8Array(entry.bytes);
  return new TextEncoder().encode(entry.text ?? "");
}

export async function exists(path: string, _options?: unknown): Promise<boolean> {
  const normalized = normalizePath(path);
  if (!normalized) return true;
  return (await getEntry(normalized)) !== null;
}

export async function mkdir(path: string, options: CreateDirOptions = {}): Promise<void> {
  const normalized = requirePath(path);
  const parent = parentPath(normalized);
  if (!options.recursive && parent && !(await exists(parent))) {
    throw new Error(`[webtau/fs] Parent directory does not exist: ${parent}`);
  }
  await ensureDirChain(normalized);
}

export async function createDir(path: string, options: CreateDirOptions = {}): Promise<void> {
  await mkdir(path, options);
}

export async function readDir(path = "", options: ReadDirOptions = {}): Promise<FsEntry[]> {
  const normalized = normalizePath(path);
  if (normalized && !(await exists(normalized))) {
    throw new Error(`[webtau/fs] Directory not found: ${normalized}`);
  }
  const all = await listEntries();
  return buildDirEntries(normalized, all, !!options.recursive);
}

export async function remove(path: string, options: RemoveOptions = {}): Promise<void> {
  const normalized = normalizePath(path);
  if (!normalized) {
    if (!options.recursive) {
      throw new Error("[webtau/fs] Removing root requires { recursive: true }.");
    }
    const all = await listEntries();
    await Promise.all(all.map((entry) => deleteEntry(entry.path)));
    return;
  }

  const entry = await getEntry(normalized);
  const prefix = `${normalized}/`;
  const all = await listEntries();
  const descendants = all
    .filter((candidate) => candidate.path.startsWith(prefix))
    .map((candidate) => candidate.path);

  if (!entry && descendants.length === 0) return;
  if ((entry?.kind === "dir" || descendants.length > 0) && !options.recursive) {
    throw new Error(`[webtau/fs] "${normalized}" is not empty. Pass { recursive: true }.`);
  }

  if (entry) {
    await deleteEntry(normalized);
  }
  await Promise.all(descendants.map((candidatePath) => deleteEntry(candidatePath)));
}

export async function removeDir(path: string, options: RemoveOptions = {}): Promise<void> {
  await remove(path, options);
}
