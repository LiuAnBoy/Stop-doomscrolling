#!/usr/bin/env node
import { mkdir, copyFile, readdir, stat } from "node:fs/promises";
import { createWriteStream, existsSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const WASM_SRC = join(root, "node_modules/@mediapipe/tasks-vision/wasm");
const WASM_DST = join(root, "public/wasm");

const MODELS_DST = join(root, "public/models");
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite";
const MODEL_FILE = "efficientdet_lite0.tflite";

async function copyWasm() {
  if (!existsSync(WASM_SRC)) {
    console.error(`[assets] WASM source missing: ${WASM_SRC}`);
    console.error("[assets] Run pnpm install first.");
    process.exit(1);
  }
  await mkdir(WASM_DST, { recursive: true });
  const files = await readdir(WASM_SRC);
  for (const f of files) {
    await copyFile(join(WASM_SRC, f), join(WASM_DST, f));
  }
  console.log(`[assets] wasm: copied ${files.length} files → public/wasm/`);
}

async function downloadModel() {
  await mkdir(MODELS_DST, { recursive: true });
  const dst = join(MODELS_DST, MODEL_FILE);
  if (existsSync(dst)) {
    const { size } = await stat(dst);
    if (size > 1_000_000) {
      console.log(`[assets] model: already exists (${(size / 1e6).toFixed(1)}MB), skip`);
      return;
    }
  }
  console.log(`[assets] model: downloading ${MODEL_FILE}...`);
  const res = await fetch(MODEL_URL);
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }
  await pipeline(res.body, createWriteStream(dst));
  const { size } = await stat(dst);
  console.log(`[assets] model: saved (${(size / 1e6).toFixed(1)}MB) → public/models/`);
}

await copyWasm();
await downloadModel();
