# TODO

## In Progress

### Auto-Repost Feature
Frontend toggle + modal done. Backend still needed:

#### Backend (Laravel — ai-blog-tool)
- [ ] Migration: `repost_schedules` table
  - `id`, `scheduled_post_id`, `platform` (twitter/threads), `platform_post_id` (filled after publish), `intervals` (JSON array of `{days, hours}` objects), `platforms` (JSON array of selected repost platforms), `status` (active/disabled), `created_at`, `updated_at`
- [ ] Migration: `reposts` table
  - `id`, `repost_schedule_id`, `interval_index`, `platform`, `scheduled_at` (calculated from publish time + interval), `status` (pending/published/failed), `platform_repost_id` (returned retweet/repost ID), `published_at`, `error_message`, `created_at`, `updated_at`
- [ ] Model: `RepostSchedule` (belongsTo ScheduledPost, hasMany Reposts)
- [ ] Model: `Repost` (belongsTo RepostSchedule)
- [ ] API: `POST /api/repost-schedules` — create repost schedule when scheduling a post with auto-repost enabled (receives intervals + platforms)
- [ ] API: `GET /api/repost-schedules/{scheduled_post_id}` — fetch existing repost config
- [ ] API: `DELETE /api/repost-schedules/{id}` — remove repost schedule
- [ ] Job: `ProcessRepostJob` — cron picks up pending reposts where `scheduled_at <= now`
- [ ] TwitterProvider: `repost(postId)` method — `POST /2/users/:id/retweets`
- [ ] ThreadsProvider: `repost(postId)` method — `POST /:id/repost`
- [ ] After publish: fill `platform_post_id` on repost_schedule, calculate `scheduled_at` for each repost row
- [ ] Cron: register `ProcessRepostJob` in scheduler
- [ ] Auto-delete repost after 12 hours (undo retweet/repost via API)

#### Frontend (WordPress plugin)
- [ ] Wire up SchedulePostModal to send repost config to API on schedule
- [ ] "Set as default" button in AutoRepostModal — save default intervals to user settings
- [ ] Show repost status in ScheduledPostDetail / published posts

## Next Up

### Instagram Publish Settings
- [ ] `like_count_disabled` param on publish
- [ ] `comments_disabled` param on publish
- [ ] Threads `reply_control` (everyone/followers/mentioned)
- [ ] Twitter `reply_settings`
- [ ] UI toggles in SchedulePostModal or publish flow

### Other Feature Ideas (not prioritized)
- [ ] Swipe files / content library
- [ ] Custom prompts for AI generation

## Nice to Have (Later)
- [ ] Analytics frontend (wire up to API)
- [ ] Queue pattern for `generate-outline` / `generate-topics`
- [ ] Webhook/SSE instead of polling
- [ ] Video tab
- [ ] ImagePickerModal AI integration
- [ ] Post version history UI
