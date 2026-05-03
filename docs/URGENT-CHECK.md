# Urgent Checks

## 🟡 Video Compression at Save-Time — BUILT 2026-05-03, R2 Test Pending

**What was built:**
- `compressed_videos` table — stores `original_url`, `compressed_url`, `compression_status` per video
- `CompressedVideo` model
- `CompressVideoJob` — dispatched on thread/short post save, compresses video via ffmpeg, stores to R2 `compressed/` folder
- `PublishToSocialPlatform` — checks all videos are `done` in `compressed_videos` before publishing to Threads, releases every 30s if not, `retryUntil(30min)`
- `ThreadsProvider` — removed all inline ffmpeg calls, uses `resolveVideoUrl()` to look up `compressed_url` from `CompressedVideo` by `original_url`
- Backfill command: `php artisan media:backfill-compression` — run 2026-05-03, dispatched 16 jobs for thread #5 videos

**Outstanding:** Test that Threads accepts `r2.dev` URLs (`pub-58db5c8381df4c99b94589b1411b8040.r2.dev`). If UNKNOWN → set up custom domain on R2 bucket. If works → fully done. See [`docs/VIDEO-PUBLISHING.md`](VIDEO-PUBLISHING.md).

## ✅ Threads Video UNKNOWN Error — FIXED 2026-05-03

**Root cause:** Meta's server-side video fetcher has an implicit download timeout (~6s). Files over ~8 MB from a VPS time out before Meta finishes downloading → `status: ERROR, error_message: UNKNOWN`. Undocumented — official spec only says 1 GB max.

**Fix:** Lowered Threads target bitrate 5 Mbps → **2 Mbps** in `ThreadsProvider`. All compressed outputs now stay under ~6 MB regardless of video duration. Also added graceful fallback: UNKNOWN video containers retry as text-only so the thread continues.

**⚠️ Outstanding:** VideoCompressor runs inside the publish job (~60s/video). Move compression to save-time before onboarding real users. See [`docs/VIDEO-PUBLISHING.md`](VIDEO-PUBLISHING.md).

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
