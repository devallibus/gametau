import { beforeEach, describe, expect, test } from "bun:test";
import {
  createDir,
  exists,
  mkdir,
  readDir,
  readFile,
  readTextFile,
  remove,
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
});
