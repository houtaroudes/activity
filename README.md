# activity

A small, boring record: one line per day describing my contribution activity.

`log.jsonl` gains a line each day from a scheduled GitHub Actions workflow. Every
line records the date, the running yearly total, how many days had activity, and
the current streak, as reported by the public GitHub contributions API.

The job runs on GitHub's own runners, so the log keeps growing whether or not any
of my machines are switched on. If the API cannot be reached that day, the line
is still written with a `source` of `unavailable`, so the record never misses a
day.

## Files

- `log.jsonl`: one JSON object per day, oldest first.
- `scripts/log.mjs`: builds the daily line.
- `.github/workflows/daily.yml`: the schedule.
