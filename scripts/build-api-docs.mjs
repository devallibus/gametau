import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const outDir = resolve(repoRoot, ".api-docs");
const jsOutDir = resolve(outDir, "js");
const rustOutDir = resolve(outDir, "rust");

function run(command) {
  execSync(command, {
    cwd: repoRoot,
    stdio: "inherit",
  });
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(jsOutDir, { recursive: true });

console.log("[docs:api] Generating TypeDoc for webtau...");
run(
  "bunx typedoc --entryPointStrategy resolve --tsconfig packages/webtau/tsconfig.json --entryPoints packages/webtau/src/core.ts packages/webtau/src/window.ts packages/webtau/src/dpi.ts --intentionallyNotExported WebWindow --intentionallyNotExported WasmModule --out .api-docs/js/webtau --name \"webtau API\"",
);

console.log("[docs:api] Generating TypeDoc for webtau-vite...");
run(
  "bunx typedoc --entryPointStrategy resolve --tsconfig packages/webtau-vite/tsconfig.json --entryPoints packages/webtau-vite/src/index.ts --out .api-docs/js/webtau-vite --name \"webtau-vite API\"",
);

console.log("[docs:api] Generating rustdoc for webtau crates...");
run("cargo doc --no-deps -p webtau -p webtau-macros");
cpSync(resolve(repoRoot, "target", "doc"), rustOutDir, { recursive: true });

const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>gametau API docs</title>
    <style>
      body {
        font-family: system-ui, -apple-system, sans-serif;
        max-width: 800px;
        margin: 2rem auto;
        padding: 0 1rem;
        line-height: 1.5;
      }
      h1 { margin-bottom: 0.5rem; }
      ul { padding-left: 1.2rem; }
      li { margin: 0.5rem 0; }
    </style>
  </head>
  <body>
    <h1>gametau API docs</h1>
    <p>Automatically generated TypeDoc and rustdoc output.</p>
    <h2>JavaScript/TypeScript</h2>
    <ul>
      <li><a href="./js/webtau/index.html">webtau</a></li>
      <li><a href="./js/webtau-vite/index.html">webtau-vite</a></li>
    </ul>
    <h2>Rust</h2>
    <ul>
      <li><a href="./rust/webtau/index.html">webtau</a></li>
      <li><a href="./rust/webtau_macros/index.html">webtau-macros</a></li>
    </ul>
  </body>
</html>
`;

writeFileSync(resolve(outDir, "index.html"), indexHtml, "utf8");
console.log("[docs:api] API docs written to .api-docs/");
