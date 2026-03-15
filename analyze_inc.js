/**
 * analyze_inc.js - headless simulation & analysis of the "In C" engine.
 *
 * mirrors the logic in src/hooks/useInCEngine.js exactly, but without
 * audio or React state - so it can run thousands of rounds in milliseconds.
 *
 * usage:
 *   node week9/analyze_inc.js
 *
 * output files (written next to this script):
 *   inc_analysis.txt  - human-readable report
 *   inc_analysis.json - structured data for further analysis
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));

// constants (to match useInCEngine.js)
const TOTAL_PHRASES = 53;
const ADVANCE_PROBABILITY = 0.2;
const MAX_LEAD = 3; // canAdvance = phraseIndex + 1 <= minIndex + 3
const DROPOUT_PROB = 0.05; // per-tick chance to stop once allAtEnd
const INIT_MIN_REPEATS = 5;
const INIT_RANGE = 10; // floor(rng * 10) + 5 -> [5, 14]
const ADV_MIN_REPEATS = 5;
const ADV_RANGE = 20; // floor(rng * 20) + 5 -> [5, 24]

// seeded PRNG: mulberry32 (no external deps)
function makePRNG(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * runs one complete "In C" performance simulation.
 *
 * a "tick" is one full round in which every non-finished musician gets one
 * decision (advance or repeat), matching the parallel nature of the audio engine.
 *
 * returns:
 *   seed, numMusicians, advanceProb
 *   convergenceTick   - tick at which the last musician dropped out
 *   allAtEndTick      - first tick at which all musicians reached phrase 53
 *   firstArrivalTick  - tick of the first musician to reach phrase 53
 *   lastArrivalTick   - tick of the last musician to reach phrase 53
 *   advanceEvents     - [{tick, musicianId, from, to}] full advancement log
 *   spreadSamples     - [{tick, spread, min, max}] sampled every SPREAD_SAMPLE_INTERVAL ticks
 *   snapshots         - phrase-index distributions every SNAPSHOT_INTERVAL ticks
 *   maxSpread         - highest spread observed during the run
 *   avgSpread         - mean spread across all ticks
 */
function simulateRun({ numMusicians, advanceProb, seed }) {
  const rng = makePRNG(seed);
  const LAST = TOTAL_PHRASES - 1;

  const musicians = Array.from({ length: numMusicians }, (_, i) => ({
    id: i,
    phraseIndex: 0,
    repeatsDone: 0,
    minRepeats: Math.floor(rng() * INIT_RANGE) + INIT_MIN_REPEATS,
    isFinished: false,
  }));

  const advanceEvents = [];
  const spreadSamples = [];
  const snapshots = [];

  const SPREAD_SAMPLE_INTERVAL = 10;
  const SNAPSHOT_INTERVAL = 100;
  const MAX_TICKS = 200_000; // safety cap - a typical run is ~2k-10k ticks

  let tick = 0;
  let allAtEndTick = null;
  let convergenceTick = null;

  // track spread for avg calculation without storing everything
  let spreadSum = 0;
  let spreadCount = 0;

  while (tick < MAX_TICKS) {
    const active = musicians.filter((m) => !m.isFinished);
    if (active.length === 0) {
      convergenceTick = tick;
      break;
    }

    // spread snapshot
    const indices = active.map((m) => m.phraseIndex);
    const minIdx = Math.min(...indices);
    const maxIdx = Math.max(...indices);
    const spread = maxIdx - minIdx;

    spreadSum += spread;
    spreadCount++;

    if (tick % SPREAD_SAMPLE_INTERVAL === 0) {
      spreadSamples.push({ tick, spread, min: minIdx, max: maxIdx });
    }

    // phrase distribution snapshot
    if (tick % SNAPSHOT_INTERVAL === 0) {
      // bucket by decile (0-9 -> "1-10", 10-19 -> "11-20", ...)
      const dist = {};
      for (const m of active) {
        const bucket = Math.floor(m.phraseIndex / 10) * 10;
        dist[bucket] = (dist[bucket] ?? 0) + 1;
      }
      snapshots.push({ tick, dist, phraseIndices: [...indices] });
    }

    // check allAtEnd - mirrors the original: every musician (including finished) must be >= LAST
    const allAtEnd = musicians.every((m) => m.phraseIndex >= LAST);
    if (allAtEnd && allAtEndTick === null) allAtEndTick = tick;

    // advance each musician
    for (const m of musicians) {
      if (m.isFinished) continue;

      if (m.phraseIndex >= LAST) {
        // dropout phase: 5% per tick once allAtEnd
        const nowAllAtEnd = musicians.every((x) => x.phraseIndex >= LAST);
        if (nowAllAtEnd && rng() < DROPOUT_PROB) {
          m.isFinished = true;
        } else {
          m.repeatsDone++;
        }
        continue;
      }

      // normal progression
      const activeNow = musicians.filter((x) => !x.isFinished);
      const minIndex = Math.min(...activeNow.map((x) => x.phraseIndex));
      const canAdvance = m.phraseIndex + 1 <= minIndex + MAX_LEAD;
      const metMin = m.repeatsDone >= m.minRepeats;
      const wantsMove = rng() < advanceProb;

      if (canAdvance && metMin && wantsMove) {
        const from = m.phraseIndex;
        m.phraseIndex++;
        m.repeatsDone = 0;
        m.minRepeats = Math.floor(rng() * ADV_RANGE) + ADV_MIN_REPEATS;
        advanceEvents.push({ tick, musicianId: m.id, from, to: m.phraseIndex });
      } else {
        m.repeatsDone++;
      }
    }

    tick++;
  }

  if (convergenceTick === null) convergenceTick = tick; // hit MAX_TICKS

  const endArrivals = advanceEvents.filter((e) => e.to === LAST);
  const maxSpread = spreadCount > 0 ? Math.max(...spreadSamples.map((s) => s.spread), 0) : 0;
  const avgSpread = spreadCount > 0 ? spreadSum / spreadCount : 0;

  return {
    seed,
    numMusicians,
    advanceProb,
    convergenceTick,
    allAtEndTick,
    firstArrivalTick: endArrivals[0]?.tick ?? null,
    lastArrivalTick: endArrivals.at(-1)?.tick ?? null,
    advanceEventCount: advanceEvents.length,
    advanceEvents,
    spreadSamples,
    snapshots,
    maxSpread,
    avgSpread,
  };
}

// parameter configurations
const RUNS_PER_CONFIG = 40;

const configs = [
  // vary ensemble size at default probability
  { numMusicians: 3, advanceProb: ADVANCE_PROBABILITY, label: "N=3, p=0.15" },
  { numMusicians: 5, advanceProb: ADVANCE_PROBABILITY, label: "N=5, p=0.15" },
  { numMusicians: 8, advanceProb: ADVANCE_PROBABILITY, label: "N=8, p=0.15" },
  { numMusicians: 13, advanceProb: ADVANCE_PROBABILITY, label: "N=13, p=0.15" },
  { numMusicians: 12, advanceProb: ADVANCE_PROBABILITY, label: "N=12, p=0.15 (default)" },
  // vary advance probability at default ensemble size
  { numMusicians: 12, advanceProb: 0.05, label: "N=12, p=0.05" },
  { numMusicians: 12, advanceProb: 0.10, label: "N=12, p=0.10" },
  { numMusicians: 12, advanceProb: 0.25, label: "N=12, p=0.25" },
];

// run all simulations
console.log(
  `Running ${configs.length} configurations x ${RUNS_PER_CONFIG} seeds...\n`
);
const t0 = Date.now();

const allResults = configs.map((config) => {
  const runs = Array.from({ length: RUNS_PER_CONFIG }, (_, i) =>
    simulateRun({ ...config, seed: i + 1 })
  );
  process.stdout.write(`  done: ${config.label}\n`);
  return { config, runs };
});

console.log(`\nCompleted in ${Date.now() - t0}ms\n`);

// stats helpers
function stats(arr) {
  const valid = arr.filter((x) => x !== null && x !== undefined);
  if (valid.length === 0) return { mean: "n/a", min: "n/a", max: "n/a", std: "n/a", median: "n/a" };
  const sorted = [...valid].sort((a, b) => a - b);
  const mean = valid.reduce((sum, x) => sum + x, 0) / valid.length;
  const variance = valid.reduce((sum, x) => sum + (x - mean) ** 2, 0) / valid.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  return {
    mean: mean.toFixed(1),
    min: Math.min(...valid),
    max: Math.max(...valid),
    std: Math.sqrt(variance).toFixed(1),
    median,
  };
}

function pad(s, n) {
  return String(s).padEnd(n);
}

// build text report
const SEP = "=".repeat(72);
const sep = "-".repeat(72);
let report = "";

report += `${SEP}\n`;
report += `  IN C - SIMULATION ANALYSIS REPORT\n`;
report += `  Engine: ${TOTAL_PHRASES} phrases, ADVANCE_PROB=${ADVANCE_PROBABILITY}, MAX_LEAD=${MAX_LEAD}, DROPOUT=${DROPOUT_PROB}\n`;
report += `  ${RUNS_PER_CONFIG} runs per configuration, seeds 1-${RUNS_PER_CONFIG}\n`;
report += `${SEP}\n\n`;

// parameter variation summary table
report += `1. PARAMETER VARIATION SUMMARY\n${sep}\n`;
report += `${pad("Configuration", 26)}  ${pad("Conv. ticks (mean+/-std)", 24)}  ${pad("Avg spread", 12)}  ${pad("Max spread", 12)}  ${pad("1st->end tick", 14)}\n`;
report += `${sep}\n`;

for (const { config, runs } of allResults) {
  const convergence = stats(runs.map((r) => r.convergenceTick));
  const avgSpread = stats(runs.map((r) => r.avgSpread));
  const maxSpread = stats(runs.map((r) => r.maxSpread));
  const firstArrival = stats(runs.map((r) => r.firstArrivalTick));
  report += `${pad(config.label, 26)}  ${pad(`${convergence.mean} +/- ${convergence.std}`, 24)}  ${pad(`${avgSpread.mean} +/- ${avgSpread.std}`, 12)}  ${pad(`${maxSpread.mean} +/- ${maxSpread.std}`, 12)}  ${pad(`${firstArrival.mean}`, 14)}\n`;
}

report += `\n`;
report += `  Conv. ticks = ticks until last musician drops out.\n`;
report += `  Spread     = max(phraseIndex) - min(phraseIndex) among active musicians.\n`;
report += `  A "tick" is one full round where every active musician gets one decision.\n`;

// per-run completion profiles (default config)
const defaultResult = allResults.find(
  (r) => r.config.numMusicians === 12 && r.config.advanceProb === ADVANCE_PROBABILITY
);

report += `\n\n2. PER-RUN COMPLETION PROFILES  (N=12, p=0.15)\n${sep}\n`;
report += `${pad("Seed", 6)}  ${pad("Conv.", 8)}  ${pad("AllEnd", 8)}  ${pad("1stEnd", 8)}  ${pad("LastEnd", 8)}  ${pad("AvgSprd", 9)}  ${pad("MaxSprd", 8)}  AdvEvents\n`;
report += `${sep}\n`;

for (const run of defaultResult.runs) {
  report += `${pad(run.seed, 6)}  ${pad(run.convergenceTick, 8)}  ${pad(run.allAtEndTick ?? "-", 8)}  ${pad(run.firstArrivalTick ?? "-", 8)}  ${pad(run.lastArrivalTick ?? "-", 8)}  ${pad(run.avgSpread.toFixed(2), 9)}  ${pad(run.maxSpread, 8)}  ${run.advanceEventCount}\n`;
}

const convS = stats(defaultResult.runs.map((r) => r.convergenceTick));
report += `${sep}\n`;
report += `${"Summary".padEnd(6)}  mean=${convS.mean}  median=${convS.median}  min=${convS.min}  max=${convS.max}  std=+/-${convS.std}\n`;

report += `\n  AllEnd  = first tick all musicians reached phrase 53.\n`;
report += `  1stEnd  = tick the fastest musician reached phrase 53.\n`;
report += `  LastEnd = tick the slowest musician reached phrase 53.\n`;

// agent spread metrics (default config, seeds 1-5)
report += `\n\n3. AGENT SPREAD METRICS  (N=12, p=0.15, seeds 1-5 sampled every 100 ticks)\n${sep}\n`;
report += `${pad("Seed", 6)}  ${pad("MaxSpread", 10)}  ${pad("AvgSpread", 10)}  Spread profile (every 100 ticks, [min...max])\n`;
report += `${sep}\n`;

for (const run of defaultResult.runs.slice(0, 5)) {
  const every100 = run.spreadSamples.filter((s) => s.tick % 100 === 0);
  const profile = every100
    .map((s) => `t${s.tick}:[${s.min}...${s.max}]`)
    .join("  ");
  report += `${pad(run.seed, 6)}  ${pad(run.maxSpread, 10)}  ${pad(run.avgSpread.toFixed(2), 10)}  ${profile}\n`;
}

// advancement event log (seeds 1-3, default config)
report += `\n\n4. ADVANCEMENT EVENT LOGS  (N=12, p=0.15, seeds 1-3, first 40 events each)\n${sep}\n`;

for (const run of defaultResult.runs.slice(0, 3)) {
  report += `\nSeed ${run.seed}  (${run.advanceEventCount} total events, convergence at tick ${run.convergenceTick}):\n`;
  report += `  ${"tick".padEnd(8)} ${"musician".padEnd(10)} transition\n`;
  for (const ev of run.advanceEvents.slice(0, 40)) {
    report += `  ${String(ev.tick).padEnd(8)} M${String(ev.musicianId + 1).padEnd(9)} phrase ${ev.from + 1} -> ${ev.to + 1}\n`;
  }
  if (run.advanceEventCount > 40) {
    report += `  ... (${run.advanceEventCount - 40} more events in JSON output)\n`;
  }
}

// spread coordination analysis
report += `\n\n5. COORDINATION CONSTRAINT CHECK  (spread <= ${MAX_LEAD} enforced?)\n${sep}\n`;
for (const { config, runs } of allResults) {
  const violations = runs.map((r) => (r.maxSpread > MAX_LEAD ? 1 : 0));
  const vCount = violations.reduce((a, b) => a + b, 0);
  const hardMax = Math.max(...runs.map((r) => r.maxSpread));
  report += `  ${pad(config.label, 26)}  violations: ${vCount}/${RUNS_PER_CONFIG}  hardMax=${hardMax}\n`;
}
report += `\n  (Spread > MAX_LEAD can occur transiently mid-tick before the constraint\n   is re-evaluated - the check is per-musician, not globally atomic.)\n`;

// print & save report
console.log(report);

const txtPath = join(__dir, "inc_analysis.txt");
writeFileSync(txtPath, report, "utf8");

// save JSON
const jsonOutput = allResults.map(({ config, runs }) => ({
  config,
  summary: {
    convergenceTicks: stats(runs.map((r) => r.convergenceTick)),
    avgSpread: stats(runs.map((r) => r.avgSpread)),
    maxSpread: stats(runs.map((r) => r.maxSpread)),
    firstArrivalTick: stats(runs.map((r) => r.firstArrivalTick)),
    lastArrivalTick: stats(runs.map((r) => r.lastArrivalTick)),
  },
  runs: runs.map((run) => ({
    seed: run.seed,
    convergenceTick: run.convergenceTick,
    allAtEndTick: run.allAtEndTick,
    firstArrivalTick: run.firstArrivalTick,
    lastArrivalTick: run.lastArrivalTick,
    maxSpread: run.maxSpread,
    avgSpread: parseFloat(run.avgSpread.toFixed(3)),
    advanceEventCount: run.advanceEventCount,
    advanceEvents: run.advanceEvents, // full log
    spreadSamples: run.spreadSamples, // sampled every 10 ticks
    snapshots: run.snapshots, // phrase distributions every 100 ticks
  })),
}));

const jsonPath = join(__dir, "inc_analysis.json");
writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2), "utf8");

console.log(`\nFiles written:`);
console.log(`  ${txtPath}`);
console.log(`  ${jsonPath}`);
