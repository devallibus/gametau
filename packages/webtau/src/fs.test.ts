import { beforeEach, describe, expect, test } from "bun:test";
import {
  copyFile,
  createDir,
  exists,
  mkdir,
  readDir,
  readFile,
  readTextFile,
  remove,
  rename,
  writeFile,
  writeTextFile,
} from "./fs";

const TEST_ROOT = "__webtau_fs_tests__";

function testPath(name: string): string {
  return `${TEST_ROOT}/${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

beforeEach(async () => {
  await remove(TEST_ROOT, { recursive: true });
  await createDir(TEST_ROOT, { recursive: true });
});

describe("webtau/fs", () => {
  test("writes and reads text files", async () => {
    const path = testPath("score");

    await writeTextFile(path, "42");

    expect(await exists(path)).toBe(true);
    expect(await readTextFile(path)).toBe("42");
  });

  test("writes and reads binary files", async () => {
    const path = testPath("bin");
    await writeFile(path, [1, 2, 3, 4]);

    const bytes = await readFile(path);
    expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
  });

  test("mkdir without recursive requires parent directory", async () => {
    const path = testPath("nested/path");
    await expect(mkdir(path)).rejects.toThrow("Parent directory does not exist");
  });

  test("readDir returns recursive directory structure", async () => {
    const root = testPath("tree");
    await createDir(`${root}/levels/world-1`, { recursive: true });
    await writeTextFile(`${root}/levels/world-1/map.txt`, "ok");

    const entries = await readDir(root, { recursive: true });
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("levels");
    expect(entries[0].isDirectory).toBe(true);
    expect(entries[0].children?.[0].name).toBe("world-1");
    expect(entries[0].children?.[0].children?.[0].name).toBe("map.txt");
    expect(entries[0].children?.[0].children?.[0].isFile).toBe(true);
  });

  test("remove requires recursive=true for non-empty directory", async () => {
    const root = testPath("remove");
    await createDir(`${root}/sub`, { recursive: true });
    await writeTextFile(`${root}/sub/file.txt`, "x");

    await expect(remove(root)).rejects.toThrow("recursive");
    await remove(root, { recursive: true });
    expect(await exists(root)).toBe(false);
  });

  // -- copyFile --

  test("copyFile copies content from one path to another", async () => {
    const src = testPath("copy-src");
    const dst = testPath("copy-dst");
    await writeTextFile(src, "hello copy");

    await copyFile(src, dst);

    expect(await readTextFile(dst)).toBe("hello copy");
    // Source should still exist after copy
    expect(await exists(src)).toBe(true);
  });

  test("copyFile copies binary content", async () => {
    const src = testPath("copy-bin-src");
    const dst = testPath("copy-bin-dst");
    await writeFile(src, [10, 20, 30]);

    await copyFile(src, dst);

    const bytes = await readFile(dst);
    expect(Array.from(bytes)).toEqual([10, 20, 30]);
  });

  test("copyFile throws for nonexistent source", async () => {
    const src = testPath("copy-missing");
    const dst = testPath("copy-dst2");
    await expect(copyFile(src, dst)).rejects.toThrow("File not found");
  });

  // -- rename --

  test("rename moves content and removes original", async () => {
    const oldP = testPath("rename-old");
    const newP = testPath("rename-new");
    await writeTextFile(oldP, "moved content");

    await rename(oldP, newP);

    expect(await readTextFile(newP)).toBe("moved content");
    expect(await exists(oldP)).toBe(false);
  });

  test("rename throws for nonexistent source", async () => {
    const oldP = testPath("rename-missing");
    const newP = testPath("rename-dst");
    await expect(rename(oldP, newP)).rejects.toThrow("File not found");
  });
});
