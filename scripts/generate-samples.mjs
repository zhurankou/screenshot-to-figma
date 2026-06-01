// Regenerates the files under samples/ from the TypeScript source of truth
// (src/schema/sampleSchemas.ts and src/prompt/buildReconstructionPrompt.ts),
// so the examples never drift from the schema the plugin actually accepts.
//
// Usage: npm run samples
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import * as esbuild from "esbuild";

const root = process.cwd();
const samplesDir = path.join(root, "samples");
const tmp = path.join(root, ".samples.tmp.mjs");

const result = await esbuild.build({
  stdin: {
    contents: `
      export { sampleSchemas } from "./src/schema/sampleSchemas";
      export { buildReconstructionPrompt } from "./src/prompt/buildReconstructionPrompt";
    `,
    resolveDir: root,
    sourcefile: "samples-entry.ts",
    loader: "ts"
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false
});

await writeFile(tmp, result.outputFiles[0].text);
const mod = await import(`file://${tmp}?t=${Date.now()}`);
await rm(tmp);

await mkdir(samplesDir, { recursive: true });

for (const [key, schema] of Object.entries(mod.sampleSchemas)) {
  await writeFile(path.join(samplesDir, `${key}.json`), JSON.stringify(schema, null, 2) + "\n");
}
await writeFile(path.join(samplesDir, "reconstruction-prompt.txt"), mod.buildReconstructionPrompt() + "\n");

console.log(`Wrote samples to ${path.relative(root, samplesDir)}`);
