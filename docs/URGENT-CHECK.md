# Urgent Checks

## ✅ Publish Now — Repost Schedule Never Created — FIXED 2026-05-02

**Root cause:** `handlePublishNow` only called `publishNowRepost.createSchedules()` when the response contained `status: 'published'`. But `SocialPublishController` always returns `status: 'publishing'` (job dispatched to queue, not done yet). So `createSchedules()` never ran → no `repost_schedules` row → job's `createReposts()` found nothing and exited silently.

**The full flow for repost to work:**
1. Frontend creates `repost_schedules` row (via `createSchedules()`) **before or right as** the job is dispatched
2. Job runs → `createReposts()` looks up `$post->repostSchedule` → finds the row → creates individual `reposts` rows (one per interval)
3. Cron job later processes each `reposts` row and fires the actual retweet

`createReposts()` in the job **only creates `reposts` rows** — it never creates the `repost_schedules` row. That's the frontend's job.

**Fix:** `SchedulePostModal/index.tsx` — moved `createSchedules()` call to fire on `queued` results (not just `succeeded`). Scheduled posts go through the same queue path, so the schedule is always created before the job finishes.

**Why scheduling worked:** the scheduled flow calls `repost.createSchedules()` immediately after `createScheduledPost()` resolves — before the job ever fires. Publish Now didn't do the same.

## ✅ Thread Publishing Silently Dying — FIXED 2026-05-02

**Root cause:** `SocialPublishController` called `$provider->publish()` synchronously inside the PHP-FPM HTTP request. nginx killed the request after 60s (`fastcgi_read_timeout`). A 22-post thread takes 160s+ — it was always going to die.

**Fix:** Controller now creates a `pending` ScheduledPost record and dispatches `PublishToSocialPlatform` job immediately, returning `{ status: "publishing" }` to the frontend. Both "Publish Now" and scheduled cron now go through the same job/queue path — no HTTP request involved in the actual publish.

**Frontend:** `SchedulePostModal` treats `publishing` response as queued success (toast). `PublishNowResult.status` type updated to include `publishing`.

**Diagnostic logs** in `TwitterProvider` reduced to vital milestones only (removed per-segment APPEND, per-chunk memory/gc, temp file noise).

---

## 🔴 Twitter API Credits Depleted — 2026-04-30

Thread publishing stops at tweet 3 with `402 CreditsDepleted`. No code bug — the Twitter developer account has run out of API credits. Top up at developer.twitter.com → billing.

**Root cause identified:** today's multiple thread publishing attempts (23 tweets × several runs) burned through the monthly credit balance mid-thread. Normal daily spend is $0.08–$0.30 (analytics reads + 2–3 posts). One full thread run = ~$0.35 extra.

## 🔴 Schedule Page — "Publish Now" Buttons Not Clickable — 2026-04-30

Social media platform buttons on the schedule page are unresponsive. Cannot manually trigger publish from the UI.

## ✅ Analytics Hourly Scheduler — CONFIRMED 2026-04-28

Verified in production log — scheduler running correctly:
- `01:53` — 3 jobs dispatched
- `05:18` — 5 jobs dispatched
- `06:00` — 0 jobs (all posts within fetch interval, none due)

## ✅ Post #96 Published Twice — CONFIRMED MANUAL 2026-04-28

Both #94 and #96 duplicate publishes on Apr 28 were manual retries by the user, not a queue bug.

## ✅ Debug Log Removed — 2026-04-28

Temporary debug log in `FetchSinglePostAnalytics.php` removed after scheduler confirmed working.
