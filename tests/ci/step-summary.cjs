#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- plain CommonJS script run directly by node */
/**
 * Prints a short Markdown summary of a test run, for $GITHUB_STEP_SUMMARY.
 *
 *   node tests/ci/step-summary.cjs vitest      >> "$GITHUB_STEP_SUMMARY"
 *   node tests/ci/step-summary.cjs playwright  >> "$GITHUB_STEP_SUMMARY"
 *
 * Never fails the job: missing reports are reported as such.
 */
const fs = require("node:fs");

function junitTotals(file) {
  if (!fs.existsSync(file)) return null;
  const xml = fs.readFileSync(file, "utf8");
  const root = xml.match(/<testsuites\b[^>]*>/);
  if (!root) return null;
  const attr = (name) => Number((root[0].match(new RegExp(`\\b${name}="([\\d.]+)"`)) || [])[1] || 0);
  const skipped = (xml.match(/<skipped\b/g) || []).length;
  return { tests: attr("tests"), failures: attr("failures") + attr("errors"), skipped, time: attr("time") };
}

function testsLine(title, totals) {
  if (!totals) return `### ${title}\n\n_No JUnit report was produced._\n`;
  const status = totals.failures > 0 ? "FAILED" : "passed";
  return [
    `### ${title}: ${status}`,
    "",
    "| Tests | Failed | Skipped | Duration |",
    "| ---: | ---: | ---: | ---: |",
    `| ${totals.tests} | ${totals.failures} | ${totals.skipped} | ${totals.time.toFixed(1)}s |`,
    "",
  ].join("\n");
}

function coverageTable(file) {
  if (!fs.existsSync(file)) return "_No coverage summary was produced._\n";
  const { total } = JSON.parse(fs.readFileSync(file, "utf8"));
  const row = (key) => `| ${key} | ${total[key].pct}% | ${total[key].covered}/${total[key].total} |`;
  return ["#### Coverage (src/)", "", "| Metric | % | Covered |", "| --- | ---: | ---: |", ...["lines", "branches", "functions", "statements"].map(row), ""].join("\n");
}

const kind = process.argv[2];
if (kind === "vitest") {
  process.stdout.write(testsLine("Vitest (unit, API routes, components)", junitTotals("test-results/vitest-junit.xml")));
  process.stdout.write(`\n${coverageTable("coverage/coverage-summary.json")}`);
} else if (kind === "playwright") {
  process.stdout.write(testsLine("Playwright E2E (chromium, next start)", junitTotals("test-results/playwright-junit.xml")));
} else {
  console.error("usage: step-summary.cjs vitest|playwright");
}
