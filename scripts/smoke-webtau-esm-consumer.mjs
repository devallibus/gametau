import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const webtauDir = path.join(repoRoot, "packages", "webtau");

const args = process.argv.slice(2);
let packageSpec;
let keepTempDir = false;

for (let idx = 0; idx < args.length; idx += 1) {
  const arg = args[idx];
  if (arg === "--spec") {
    packageSpec = args[idx + 1];
    idx += 1;
    continue;
  }
  if (arg === "--keep-temp") {
    keepTempDir = true;
    continue;
  }
  throw new Error(`Unknown argument: ${arg}`);
}

if (args.includes("--spec") && !packageSpec) {
  throw new Error("Missing value for --spec.");
}

const run = (command, commandArgs, options = {}) => {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    ...options,
  });
  if (result.error) {
    throw new Error(`Command failed to start: ${command} (${result.error.message})`);
  }
  if (result.status !== 0) {
    throw new Error(
      `Command failed: ${command} ${commandArgs.join(" ")} (exit ${result.status ?? "unknown"})`,
    );
  }
};

const runCapture = (command, commandArgs, options = {}) => {
  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
    ...options,
  });
  if (result.error) {
    throw new Error(`Command failed to start: ${command} (${result.error.message})`);
  }
  if (result.status !== 0) {
    throw new Error(
      `Command failed: ${command} ${commandArgs.join(" ")} (exit ${result.status ?? "unknown"})`,
    );
  }
  return result.stdout.trim();
};

const resolveNpmRunner = () => {
  const npmExecPath = process.env.npm_execpath;
  if (
    npmExecPath &&
    npmExecPath.endsWith("npm-cli.js") &&
    existsSync(npmExecPath)
  ) {
    return {
      command: process.execPath,
      prefixArgs: [npmExecPath],
    };
  }

  const npmCliCandidates = process.platform === "win32"
    ? [path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")]
    : [path.resolve(path.dirname(process.execPath), "..", "lib", "node_modules", "npm", "bin", "npm-cli.js")];

  for (const candidate of npmCliCandidates) {
    if (existsSync(candidate)) {
      return {
        command: process.execPath,
        prefixArgs: [candidate],
      };
    }
  }

  return {
    command: "npm",
    prefixArgs: [],
  };
};

const npmRunner = resolveNpmRunner();
const runNpm = (npmArgs, options = {}) => run(npmRunner.command, [...npmRunner.prefixArgs, ...npmArgs], options);
const runNpmCapture = (npmArgs, options = {}) =>
  runCapture(npmRunner.command, [...npmRunner.prefixArgs, ...npmArgs], options);

const createdTarballs = [];
let tempProjectDir = "";

try {
  if (!packageSpec) {
    runNpm(["run", "build"], { cwd: webtauDir });
    const packOutput = runNpmCapture(["pack", "--silent"], { cwd: webtauDir });
    const tarballName = packOutput.split(/\r?\n/).pop();
    if (!tarballName) {
      throw new Error("npm pack did not return a tarball name.");
    }
    const tarballPath = path.join(webtauDir, tarballName);
    createdTarballs.push(tarballPath);
    packageSpec = tarballPath;
  }

  tempProjectDir = mkdtempSync(path.join(tmpdir(), "webtau-esm-smoke-"));

  runNpm(["init", "-y"], { cwd: tempProjectDir });
  runNpm(["install", packageSpec], { cwd: tempProjectDir });
  run(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      [
        "const entrypoints = ['webtau', 'webtau/core', 'webtau/task'];",
        "for (const id of entrypoints) {",
        "  await import(id);",
        "}",
        "console.log('webtau ESM smoke OK for:', entrypoints.join(', '));",
      ].join("\n"),
    ],
    { cwd: tempProjectDir },
  );
} finally {
  if (!keepTempDir && tempProjectDir) {
    rmSync(tempProjectDir, { recursive: true, force: true });
  }
  for (const tarballPath of createdTarballs) {
    rmSync(tarballPath, { force: true });
  }
}
