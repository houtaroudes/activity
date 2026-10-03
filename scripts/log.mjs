// Appends one line to log.jsonl describing today's contribution activity.
// Runs from a scheduled GitHub Actions workflow, see .github/workflows/daily.yml.

import { appendFile } from "node:fs/promises";

const USER = "houtaroudes";
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

async function main() {
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
    console.error(`Activity API unavailable: ${error.message}`);
  }
  await appendFile("log.jsonl", `${JSON.stringify(entry)}\n`);
  console.log(JSON.stringify(entry));
}

await main();
