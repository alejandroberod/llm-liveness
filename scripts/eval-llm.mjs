#!/usr/bin/env node
// Evalúa el endpoint /api/analyze contra un dataset etiquetado.
//
// Estructura esperada del dataset:
//   dataset/live/*.jpg             -> selfies reales
//   dataset/spoof/<subtipo>/*.jpg  -> ataques (print, screen, mask...). El subtipo es opcional.
//
// Uso:
//   node scripts/eval-llm.mjs [--dir dataset] [--url http://localhost:3000/api/analyze]
//     [--model gemini-3.5-flash] [--concurrency 3] [--limit 50]

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    dir: { type: "string", default: "dataset" },
    url: { type: "string", default: "http://localhost:3000/api/analyze" },
    model: { type: "string" },
    concurrency: { type: "string", default: "3" },
    limit: { type: "string" },
  },
});

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".heic": "image/heic" };

function collectSamples(dir) {
  const samples = [];
  for (const label of ["live", "spoof"]) {
    const root = path.join(dir, label);
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile() || !MIME[path.extname(entry.name).toLowerCase()]) continue;
      const abs = path.join(entry.parentPath, entry.name);
      const rel = path.relative(root, abs).split(path.sep);
      samples.push({
        file: path.relative(dir, abs).split(path.sep).join("/"),
        abs,
        label,
        subtype: label === "spoof" && rel.length > 1 ? rel[0] : "",
      });
    }
  }
  return samples;
}

async function analyze({ abs, ...sample }) {
  const form = new FormData();
  const type = MIME[path.extname(abs).toLowerCase()];
  form.append("image", new Blob([fs.readFileSync(abs)], { type }), path.basename(abs));
  if (args.model) form.append("model", args.model);

  const started = performance.now();
  try {
    const res = await fetch(args.url, { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    const latencyMs = Math.round(performance.now() - started);
    if (!res.ok || !body.result) {
      return { ...sample, predicted: "error", latencyMs, error: body.error ?? `HTTP ${res.status}` };
    }
    return { ...sample, predicted: body.result.verdict, spoofScore: body.result.spoofScore, latencyMs, result: body.result };
  } catch (error) {
    return { ...sample, predicted: "error", error: String(error.message ?? error) };
  }
}

// Política conservadora: solo "live" se acepta; "inconclusive" cuenta como rechazo.
const accepted = (r) => r.predicted === "live";
const isCorrect = (r) => (r.label === "live" ? accepted(r) : !accepted(r));
const ratio = (n, d) => (d === 0 ? null : n / d);
const pct = (v) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);

async function runPool(items, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < items.length) {
        const i = next++;
        const r = (results[i] = await analyze(items[i]));
        const status = r.predicted === "error" ? "ERR " : isCorrect(r) ? "ok  " : "FAIL";
        console.log(`[${String(++done).padStart(4)}/${items.length}] ${status} ${r.label.padEnd(5)} -> ${r.predicted.padEnd(12)} ${String(r.spoofScore ?? "").padEnd(5)} ${r.file}`);
      }
    }),
  );
  return results;
}

function report(results) {
  const valid = results.filter((r) => r.predicted !== "error");
  const live = valid.filter((r) => r.label === "live");
  const spoof = valid.filter((r) => r.label === "spoof");

  const apcer = ratio(spoof.filter(accepted).length, spoof.length);
  const bpcer = ratio(live.filter((r) => !accepted(r)).length, live.length);
  const latencies = valid.map((r) => r.latencyMs).sort((a, b) => a - b);
  const latency = (q) => (latencies.length ? `${latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))]} ms` : "—");

  const rows = [
    ["Imágenes live / spoof", `${live.length} / ${spoof.length}`],
    ["Errores (excluidos)", String(results.length - valid.length)],
    ["Accuracy", pct(ratio(valid.filter(isCorrect).length, valid.length))],
    ["APCER (ataques aceptados como live)", pct(apcer)],
    ["BPCER (reales rechazados)", pct(bpcer)],
    ["ACER (promedio APCER/BPCER)", pct(apcer === null || bpcer === null ? null : (apcer + bpcer) / 2)],
    ["Tasa inconclusive", pct(ratio(valid.filter((r) => r.predicted === "inconclusive").length, valid.length))],
    ["Latencia p50 / p95", `${latency(0.5)} / ${latency(0.95)}`],
  ];
  for (const subtype of new Set(spoof.map((r) => r.subtype).filter(Boolean))) {
    const group = spoof.filter((r) => r.subtype === subtype);
    rows.push([`  APCER ${subtype} (n=${group.length})`, pct(ratio(group.filter(accepted).length, group.length))]);
  }

  const width = Math.max(...rows.map(([k]) => k.length));
  console.log(rows.map(([k, v]) => `${k.padEnd(width)}  ${v}`).join("\n"));

  const misses = valid.filter((r) => !isCorrect(r));
  if (misses.length) {
    console.log(`\nClasificaciones incorrectas (${misses.length}):`);
    for (const m of misses) console.log(`  ${m.label} -> ${m.predicted} (${m.spoofScore}) ${m.file}\n     ${m.result.attackType} | ${m.result.reason}`);
  }

  const errors = results.filter((r) => r.predicted === "error");
  if (errors.length) {
    console.log(`\nErrores (${errors.length}):`);
    for (const e of errors) console.log(`  ${e.file}: ${e.error}`);
  }
}

let samples = collectSamples(args.dir);
if (args.limit) samples = samples.sort(() => Math.random() - 0.5).slice(0, Number(args.limit));
if (samples.length === 0) {
  console.error(`No se encontraron imágenes en ${path.resolve(args.dir)}/live o /spoof`);
  process.exit(1);
}

console.log(`Evaluando ${samples.length} imágenes contra ${args.url}${args.model ? ` (modelo ${args.model})` : ""}\n`);
const results = await runPool(samples, Number(args.concurrency));

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const out = path.join("results", `llm-${args.model ?? "default"}-${stamp}.json`);
fs.mkdirSync("results", { recursive: true });
fs.writeFileSync(out, JSON.stringify(results, null, 2));

console.log(`\nResultados guardados en ${out}\n`);
report(results);
