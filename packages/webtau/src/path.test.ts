import { describe, expect, test } from "bun:test";
import {
  appCacheDir,
  appConfigDir,
  appDataDir,
  appLocalDataDir,
  appLogDir,
  audioDir,
  basename,
  desktopDir,
  dirname,
  documentDir,
  downloadDir,
  extname,
  homeDir,
  isAbsolute,
  join,
  normalize,
  pictureDir,
  publicDir,
  resolve,
  resourceDir,
  sep,
  tempDir,
  videoDir,
} from "./path";

describe("webtau/path", () => {
  // -- sep --

  test("sep returns forward slash on web", () => {
    expect(sep()).toBe("/");
  });

  // -- directory resolvers --

  test("appDataDir returns virtual path", async () => {
    expect(await appDataDir()).toBe("/app/data");
  });

  test("appLocalDataDir returns virtual path", async () => {
    expect(await appLocalDataDir()).toBe("/app/local-data");
  });

  test("appConfigDir returns virtual path", async () => {
    expect(await appConfigDir()).toBe("/app/config");
  });

  test("appCacheDir returns virtual path", async () => {
    expect(await appCacheDir()).toBe("/app/cache");
  });

  test("appLogDir returns virtual path", async () => {
    expect(await appLogDir()).toBe("/app/log");
  });

  test("desktopDir returns virtual path", async () => {
    expect(await desktopDir()).toBe("/app/desktop");
  });

  test("documentDir returns virtual path", async () => {
    expect(await documentDir()).toBe("/app/documents");
  });

  test("downloadDir returns virtual path", async () => {
    expect(await downloadDir()).toBe("/app/downloads");
  });

  test("homeDir returns virtual path", async () => {
    expect(await homeDir()).toBe("/app/home");
  });

  test("audioDir returns virtual path", async () => {
    expect(await audioDir()).toBe("/app/audio");
  });

  test("pictureDir returns virtual path", async () => {
    expect(await pictureDir()).toBe("/app/pictures");
  });

  test("publicDir returns virtual path", async () => {
    expect(await publicDir()).toBe("/app/public");
  });

  test("videoDir returns virtual path", async () => {
    expect(await videoDir()).toBe("/app/videos");
  });

  test("resourceDir returns virtual path", async () => {
    expect(await resourceDir()).toBe("/app/resources");
  });

  test("tempDir returns virtual path", async () => {
    expect(await tempDir()).toBe("/app/temp");
  });

  // -- basename --

  test("basename extracts filename from path", async () => {
    expect(await basename("/app/data/save.json")).toBe("save.json");
  });

  test("basename strips extension when provided", async () => {
    expect(await basename("/app/data/save.json", ".json")).toBe("save");
  });

  test("basename handles trailing slashes", async () => {
    expect(await basename("/app/data/")).toBe("data");
  });

  test("basename handles single segment", async () => {
    expect(await basename("file.txt")).toBe("file.txt");
  });

  // -- dirname --

  test("dirname returns parent directory", async () => {
    expect(await dirname("/app/data/save.json")).toBe("/app/data");
  });

  test("dirname returns root for top-level path", async () => {
    expect(await dirname("/file.txt")).toBe("/");
  });

  test("dirname handles trailing slashes", async () => {
    expect(await dirname("/app/data/")).toBe("/app");
  });

  // -- extname --

  test("extname returns file extension with dot", async () => {
    expect(await extname("/app/data/save.json")).toBe(".json");
  });

  test("extname returns empty string for no extension", async () => {
    expect(await extname("readme")).toBe("");
  });

  test("extname returns last extension for multiple dots", async () => {
    expect(await extname("archive.tar.gz")).toBe(".gz");
  });

  test("extname returns empty for dotfiles", async () => {
    expect(await extname(".gitignore")).toBe("");
  });

  // -- join --

  test("join combines path segments", async () => {
    expect(await join("/app", "data", "save.json")).toBe("/app/data/save.json");
  });

  test("join normalizes double slashes", async () => {
    expect(await join("/app/", "/data")).toBe("/app/data");
  });

  test("join resolves relative segments", async () => {
    expect(await join("/app", "data", "..", "config")).toBe("/app/config");
  });

  // -- normalize --

  test("normalize resolves dot segments", async () => {
    expect(await normalize("/app/data/../config/./settings.json")).toBe(
      "/app/config/settings.json",
    );
  });

  test("normalize collapses repeated separators", async () => {
    expect(await normalize("/app//data///file.txt")).toBe("/app/data/file.txt");
  });

  test("normalize returns dot for empty relative path", async () => {
    expect(await normalize("")).toBe(".");
  });

  test("normalize preserves root", async () => {
    expect(await normalize("/")).toBe("/");
  });

  // -- resolve --

  test("resolve combines relative paths", async () => {
    expect(await resolve("/app", "data", "save.json")).toBe(
      "/app/data/save.json",
    );
  });

  test("resolve uses last absolute path as base", async () => {
    expect(await resolve("data", "/other", "file.txt")).toBe(
      "/other/file.txt",
    );
  });

  // -- isAbsolute --

  test("isAbsolute returns true for absolute paths", async () => {
    expect(await isAbsolute("/app/data")).toBe(true);
  });

  test("isAbsolute returns false for relative paths", async () => {
    expect(await isAbsolute("data/file.txt")).toBe(false);
  });

  test("isAbsolute returns false for empty string", async () => {
    expect(await isAbsolute("")).toBe(false);
  });
});
