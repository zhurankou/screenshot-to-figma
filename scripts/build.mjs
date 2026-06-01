import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import * as esbuild from "esbuild";

const root = process.cwd();
const dist = path.join(root, "dist");
const watch = process.argv.includes("--watch");
// es2017 keeps async/await native (supported by Figma) while down-compiling
// newer syntax the plugin runtime rejects, e.g. object spread `{ ...x }` (ES2018).
const target = "es2017";

async function buildUi() {
  const uiResult = await esbuild.build({
    entryPoints: [path.join(root, "src/ui.ts")],
    bundle: true,
    write: false,
    format: "iife",
    target,
    minify: false,
    sourcemap: false
  });

  const [html, css] = await Promise.all([
    readFile(path.join(root, "src/ui.html"), "utf8"),
    readFile(path.join(root, "src/styles.css"), "utf8")
  ]);

  const js = uiResult.outputFiles[0].text;
  const bundledHtml = html
    .replace('<link rel="stylesheet" href="./styles.css">', `<style>${css}</style>`)
    .replace('<script type="module" src="./ui.ts"></script>', `<script>${js}</script>`);

  await writeFile(path.join(dist, "ui.html"), bundledHtml);
}

async function buildCode() {
  await esbuild.build({
    entryPoints: [path.join(root, "src/code.ts")],
    bundle: true,
    outfile: path.join(dist, "code.js"),
    format: "iife",
    target,
    minify: false,
    sourcemap: false
  });

  const [controller, ui] = await Promise.all([
    readFile(path.join(dist, "code.js"), "utf8"),
    readFile(path.join(dist, "ui.html"), "utf8")
  ]);
  const checks = [
    { re: /\?\?/, label: "nullish coalescing (??)" },
    { re: /\?\./, label: "optional chaining (?.)" },
    { re: /\{\s*\.\.\./, label: "object spread ({ ...x })" }
  ];
  for (const bundle of [controller, ui]) {
    for (const { re, label } of checks) {
      if (re.test(bundle)) {
        throw new Error(`Plugin bundle contains ${label}, which some Figma runtimes reject. Lower the esbuild target.`);
      }
    }
  }
}

async function buildAll() {
  await mkdir(dist, { recursive: true });
  await Promise.all([buildCode(), buildUi()]);
  console.log(`Built plugin assets in ${path.relative(root, dist)}`);
}

if (watch) {
  await buildAll();
  const codeContext = await esbuild.context({
    entryPoints: [path.join(root, "src/code.ts")],
    bundle: true,
    outfile: path.join(dist, "code.js"),
    format: "iife",
    target,
    minify: false,
    sourcemap: false
  });

  await codeContext.watch();
  const uiContext = await esbuild.context({
    entryPoints: [path.join(root, "src/ui.ts")],
    bundle: true,
    write: false,
    format: "iife",
    target,
    minify: false,
    sourcemap: false,
    plugins: [
      {
        name: "inline-ui-writer",
        setup(build) {
          build.onEnd(async (result) => {
            if (result.errors.length === 0) {
              await buildUi();
              console.log("Rebuilt UI");
            }
          });
        }
      }
    ]
  });
  await uiContext.watch();
  console.log("Watching src for changes...");
} else {
  await buildAll();
}
