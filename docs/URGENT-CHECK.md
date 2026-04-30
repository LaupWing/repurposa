# Urgent Checks

## 🔴 Twitter API Credits Depleted — 2026-04-30

Thread publishing stops at tweet 3 with `402 CreditsDepleted`. No code bug — the Twitter developer account has run out of API credits. Top up at developer.twitter.com → billing.

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
