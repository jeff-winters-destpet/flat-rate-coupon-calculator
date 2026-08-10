// Compares the tool's frozen FLAT table against the live booking page.
//
// The four flat rates live in footer custom code on the Webflow page and can be
// changed there by anyone, without touching this repo. When they diverge, the
// tool keeps producing confident coupons built on a price Yourgi no longer
// charges, and nothing in the UI says so. This is the thing that notices.
//
// Exit code is always 0. The outcome is reported through GITHUB_OUTPUT so the
// workflow decides what to do, rather than a red X nobody reads.

import { readFile, writeFile, appendFile } from "node:fs/promises";

const PAGE = "https://www.yourgi.com/book/best-care-guarantee";
const FILE = "coupon-calculator.html";
const BUMP_AFTER_DAYS = 7;

async function setOutput(key, value) {
  const delim = "__GHA_EOF__";
  await appendFile(process.env.GITHUB_OUTPUT, `${key}<<${delim}\n${value}\n${delim}\n`);
}

// data-s doubles as the FLAT key, so the two sides join without a lookup table.
function parseLive(html) {
  const re = /data-s="([^"]+)"\s+data-r="([^"]+)"\s+data-u="([^"]+)"/g;
  const out = {};
  let m;
  while ((m = re.exec(html))) out[m[1]] = { rate: Number(m[2]), unit: m[3] };
  return out;
}

function parseTool(src) {
  const block = src.match(/var FLAT\s*=\s*\{([\s\S]*?)\};/);
  if (!block) return null;
  const re = /"([^"]+)"\s*:\s*\{\s*rate:\s*([\d.]+)\s*,\s*unit:\s*"([^"]+)"/g;
  const out = {};
  let m;
  while ((m = re.exec(block[1]))) out[m[1]] = { rate: Number(m[2]), unit: m[3] };
  return out;
}

function daysBetween(isoA, isoB) {
  return Math.round((Date.parse(isoB) - Date.parse(isoA)) / 86400000);
}

const today = new Date().toISOString().slice(0, 10);
let status = "ok";
const lines = [];

const src = await readFile(FILE, "utf8");
const tool = parseTool(src);
const asOf = (src.match(/var RATES_AS_OF\s*=\s*"([^"]+)"/) || [])[1] || null;

let html = "";
try {
  const res = await fetch(PAGE, { headers: { "user-agent": "yourgi-rate-drift-check" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  html = await res.text();
} catch (err) {
  status = "error";
  lines.push(`Could not read the booking page: \`${err.message}\`.`, "", `Page: ${PAGE}`);
}

const live = html ? parseLive(html) : {};

if (status === "ok" && !tool) {
  status = "error";
  lines.push(`Could not find the \`FLAT\` table in \`${FILE}\`. The parser in this check needs updating.`);
}

// An empty parse is the dangerous failure: the check would pass forever while
// silently comparing nothing. Treat it as an alert, not a pass.
if (status === "ok" && Object.keys(live).length === 0) {
  status = "error";
  lines.push(
    "The booking page loaded but produced no service tiles.",
    "",
    "Either the page markup changed or the widget moved. Until this is fixed the drift check is blind, " +
      "so the rate table is unmonitored. Re-check the `data-s` / `data-r` / `data-u` attributes on the page " +
      "and update the parser in `.github/scripts/check-rates.mjs`."
  );
}

if (status === "ok") {
  const keys = [...new Set([...Object.keys(tool), ...Object.keys(live)])].sort();
  const diffs = [];
  for (const k of keys) {
    const t = tool[k];
    const l = live[k];
    if (!t) diffs.push(`- **${k}** is on the live page at $${l.rate}/${l.unit} but missing from \`FLAT\`.`);
    else if (!l) diffs.push(`- **${k}** is in \`FLAT\` at $${t.rate}/${t.unit} but no longer on the live page.`);
    else if (t.rate !== l.rate || t.unit !== l.unit)
      diffs.push(`- **${k}**: tool says $${t.rate}/${t.unit}, live page says **$${l.rate}/${l.unit}**.`);
  }

  if (diffs.length) {
    status = "drift";
    lines.push(
      "The tool's rate table no longer matches the live booking page.",
      "",
      ...diffs,
      "",
      "Every coupon the tool produces is now built on a price Yourgi does not charge. " +
        "Nothing in the tool's UI reflects this.",
      "",
      "**To fix:** update `FLAT` and `RATES_AS_OF` in `" + FILE + "`, run `?selftest=1` and correct any " +
        "expectations that depended on the old rate, then close this issue. " +
        "The hosted copy updates when the change lands on `main`.",
      "",
      `Checked ${today} against ${PAGE}`
    );
  } else {
    lines.push(`All four rates match the live page as of ${today}.`);
  }
}

// Only bump the recorded date on a clean match, and only occasionally, to keep
// the commit log readable. If this workflow ever dies, the date stops advancing
// and the tool's own 90-day staleness notice fires as the backstop. That is
// deliberate: do not "fix" it by bumping unconditionally.
let bumped = "false";
if (status === "ok" && asOf && daysBetween(asOf, today) >= BUMP_AFTER_DAYS) {
  await writeFile(FILE, src.replace(/(var RATES_AS_OF\s*=\s*")[^"]+(")/, `$1${today}$2`));
  bumped = "true";
  lines.push("", `Advanced \`RATES_AS_OF\` from ${asOf} to ${today}.`);
}

await setOutput("status", status);
await setOutput("bumped", bumped);
await setOutput("report", lines.join("\n"));

console.log(`status=${status} bumped=${bumped} rates_as_of=${asOf}`);
console.log(lines.join("\n"));
