# Urgent Checks

## Analytics Hourly Scheduler — Confirm Automatic Run
**Date added: 2026-04-28**

We confirmed:
- Queue worker was stale (started Apr 25), restarted manually on Apr 28
- Manual dispatch logs correctly after restart
- `$RESTART_QUEUES()` is in the Forge deploy script but didn't restart the worker properly on Apr 26 redeploy — root cause unclear

**Still needs confirmation:**
- Watch for `FetchPostAnalytics: dispatched X fetch jobs from Y published posts` in the production log at the top of any hour (e.g. 06:00, 07:00 UTC)
- If it doesn't appear → scheduler is dispatching the job but queue isn't picking it up, or `isDueForFetch` is returning false for all posts

**Log to check:**
```bash
grep "FetchPostAnalytics" storage/logs/laravel-2026-04-28.log
```

## Post #96 Published Twice on LinkedIn
**Date added: 2026-04-28**

- `schedulable_id: 96` published twice at 02:35 and 02:38 on Apr 28
- Duplicate publish bug — same post, same platform, 3 minutes apart
- Fix was deployed (delete failed records before Publish Now retry) but this happened AFTER that fix
- Needs investigation — may be a scheduled post firing twice from the queue

## Debug Log to Remove
- `FetchSinglePostAnalytics.php` line 28 has a temporary debug log — remove once hourly run is confirmed working
