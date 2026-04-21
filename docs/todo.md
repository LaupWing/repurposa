# TODO

## 🔴 High Priority

### Language System — Phase 1: Detection + Config
See [LANGUAGE.md](./LANGUAGE.md) for full design.

- [ ] PHP detection in `repurposa.php` (`isSnelstack`, `siteDefault`, `current`)
- [ ] Pass via `wp_localize_script` into `repurposaConfig.language`
- [ ] Language selector in SettingsPage (nl/en, saved to `repurposa_language` WP option)
- [ ] Laravel migration: add `language` to `posts` table
- [ ] Update `PostApiController` store/update to accept `language`

## Active

### Delete Blog Confirmation Modal
- [ ] Replace browser `confirm()` in SettingsPanel.tsx with a proper modal

### Instagram / Social Publish Settings
- [ ] `like_count_disabled` + `comments_disabled` on Instagram publish
- [ ] Threads `reply_control` (everyone/followers/mentioned)
- [ ] Twitter `reply_settings`
- [ ] UI toggles in SchedulePostModal

### Language Detection (needs design doc first — spar before building)
- [ ] Detect WordPress site language via theme filter hooks
- [ ] Pass language to React via `wp_localize_script`
- [ ] Send language to Laravel on all AI generation requests
- [ ] Save language on Laravel post model
- [ ] Show language badge on blog cards
- [ ] Short posts inherit blog language

## Platform Approvals Needed
- [ ] LinkedIn Community Management API — screencast of OAuth + publish flow
- [ ] Twitter API — elevated access
- [ ] Facebook/Instagram — App Review for `instagram_content_publish`
- [ ] Threads — API access for production

## Nice to Have (Later)
- [ ] Analytics frontend (wire to API)
- [ ] Webhook/SSE instead of polling for blog generation
- [ ] Video tab
- [ ] Version history modal (connect to real PostVersion data)
- [ ] Swipe files / content library
- [ ] Custom prompts for AI generation
- [ ] Queue pattern for `generate-outline` / `generate-topics`

## Completed
- Auto-repost backend (migrations, models, routes, ProcessRepostJob, Twitter + Threads repost methods)
- Auto-repost frontend (SchedulePostModal, AutoRepostModal, ScheduledPostDetail)
- TipTap AI bubble menu (improve/rewrite/shorter/longer/fix → refine-text API)
- Regenerate blog (RegenerateModal + POST /posts/{post}/regenerate)
- WP posts sync (REST endpoint + frontend import logic)
