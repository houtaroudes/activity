// Records today's contribution activity as one line in log.jsonl, replacing any
// line already written for the same date. Runs from a scheduled GitHub Actions
// workflow, see .github/workflows/daily.yml.

import { readFile, writeFile } from "node:fs/promises";

const USER = "houtaroudes";
const FILE = "log.jsonl";
const ENDPOINT = `https://github-contributions-api.jogruber.de/v4/${USER}?y=last`;

const today = new Date().toISOString().slice(0, 10);

/** Length of the run of active days ending today, or yesterday if today is empty. */
function currentStreak(days) {
  const byDate = new Map(days.map((day) => [day.date, day.count]));
  const cursor = new Date(`${today}T00:00:00Z`);
  // Today may simply be young, so do not let it break a streak that is alive.
  if (!byDate.get(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (byDate.get(cursor.toISOString().slice(0, 10)) > 0) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

async function readEntries() {
  try {
    const text = await readFile(FILE, "utf8");
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * What to record when the API could not answer: the last totals it did give,
 * tagged with the date they came from. Writing zeros instead would draw a
 * collapse in the graph that never happened.
 */
function carriedForward(kept, fallback) {
  for (let i = kept.length - 1; i >= 0; i -= 1) {
    try {
      const last = JSON.parse(kept[i]);
      if (typeof last.total !== "number") continue;
      return {
        date: today,
        total: last.total,
        activeDays: last.activeDays ?? 0,
        streak: last.streak ?? 0,
        source: "unavailable",
        carriedFrom: last.date,
      };
    } catch {
      // A malformed older line is not a source of truth; keep looking back.
    }
  }
  return fallback;
}

async function main() {
  // Read first: a failed fetch falls back to the most recent entry.
  const kept = (await readEntries()).filter((line) => {
    try {
      return JSON.parse(line).date !== today;
    } catch {
      return true;
    }
  });

  let entry = { date: today, total: 0, activeDays: 0, streak: 0, source: "unavailable" };
  try {
    const response = await fetch(ENDPOINT);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const days = data.contributions ?? [];
    entry = {
      date: today,
      total: data.total?.lastYear ?? 0,
      activeDays: days.filter((day) => day.count > 0).length,
      streak: currentStreak(days),
      source: "api",
    };
  } catch (error) {
    entry = carriedForward(kept, entry);
    console.error(`Activity API unavailable: ${error.message}`);
  }

  // One line per date: the kept lines are older dates, so a second run today
  // replaces today's line rather than adding another.
  await writeFile(FILE, [...kept, JSON.stringify(entry)].join("\n") + "\n");
  console.log(JSON.stringify(entry));
}

await main();
