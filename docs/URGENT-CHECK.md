# Urgent Checks

## ✅ Analytics Hourly Scheduler — CONFIRMED 2026-04-28

Verified in production log — scheduler running correctly:
- `01:53` — 3 jobs dispatched
- `05:18` — 5 jobs dispatched
- `06:00` — 0 jobs (all posts within fetch interval, none due)

## Post #96 Published Twice on LinkedIn
**Date added: 2026-04-28**

- `schedulable_id: 96` published twice at 02:35 and 02:38 on Apr 28
- Duplicate publish bug — same post, same platform, 3 minutes apart
- Fix was deployed (delete failed records before Publish Now retry) but this happened AFTER that fix
- Needs investigation — may be a scheduled post firing twice from the queue

## Debug Log to Remove
- `FetchSinglePostAnalytics.php` line 28 has a temporary debug log — remove once hourly run is confirmed working
