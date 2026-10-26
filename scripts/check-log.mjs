// Fails if log.jsonl names the same date twice. scripts/log.mjs already drops a
// line for today before appending, and the workflow runs one job at a time, so a
// duplicate should not happen; this checks the file rather than trusting that,
// because a second line for a day would draw that day twice and nobody would
// notice from the graph. The workflow runs it between writing and committing.
//
// Run it by hand with `node scripts/check-log.mjs`, or name another file:
// `node scripts/check-log.mjs path/to/log.jsonl`.

import { readFile } from "node:fs/promises";

const FILE = process.argv[2] ?? "log.jsonl";

let text;
try {
  text = await readFile(FILE, "utf8");
} catch (error) {
  console.error(`${FILE} could not be read: ${error.message}`);
  process.exit(1);
}

// First line number that claimed each date, so the message can name both.
const seen = new Map();
const problems = [];

text.split("\n").forEach((raw, index) => {
  const line = raw.trim();
  if (!line) return;

  const where = `line ${index + 1}`;
  let entry;
  try {
    entry = JSON.parse(line);
  } catch (error) {
    // A line that will not parse could be hiding any date, so it cannot be
    // skipped: the duplicate check is only as good as the lines it can read.
    problems.push(`${where} is not JSON: ${error.message}`);
    return;
  }

  if (typeof entry.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    problems.push(`${where} has no YYYY-MM-DD date`);
    return;
  }

  if (seen.has(entry.date)) {
    problems.push(`${entry.date} is on line ${seen.get(entry.date)} and again on line ${index + 1}`);
    return;
  }

  seen.set(entry.date, index + 1);
});

if (problems.length > 0) {
  console.error(`${FILE} has ${problems.length} problem${problems.length === 1 ? "" : "s"}:`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error("");
  console.error("One line per date: remove the extra line for that date, keeping the one that");
  console.error("came last. Re-run this check before committing.");
  process.exit(1);
}

console.log(`${FILE}: ${seen.size} dates, one line each.`);
