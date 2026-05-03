# TODO

## 🔴 Urgent

### Bug Fixes

-   [ ] **Schedule page — "Publish Now" buttons not clickable** — social media platform buttons unresponsive
-   [ ] **Auto-retry thread jobs after SIGKILL** — increasing `$tries` doesn't work because the `publishing` guard returns early. Fix: in `failed()`, if partial progress exists and attempts < 3, reset to `pending` and dispatch a new job with a short delay. This gives automatic resume without manual UI retry.
-   [ ] **Test R2 URLs with Threads** — `compressed_videos` table + `CompressVideoJob` done. Backfill run on 2026-05-03. Need to publish thread #5 to Threads and confirm no UNKNOWN error with `r2.dev` URLs. See [`docs/VIDEO-PUBLISHING.md`](VIDEO-PUBLISHING.md).
-   [ ] **Twitter $0.20/URL tweet — platform-aware CTA + email fallback**
    - X raised URL tweet cost to $0.20 on Apr 20 2026 (1900% increase, applies to all URLs incl. t.co). Ref: [TechCrunch](https://techcrunch.com/2026/04/22/x-makes-it-more-expensive-to-post-links-through-its-api/)
    - Our auto-generated CTA reply links to the blog post → costs $0.20 every Twitter publish. Threads unaffected.
    - **Fix:** platform-aware CTA — Twitter gets "Follow for more" (no URL), Threads keeps blog link as-is
    - **Email fallback** — after Twitter publish, email user the original blog-link CTA text in a formatted block so they can copy-paste it as a native reply on X (native posting = free, no API cost). No clipboard API needed in email — just display the text clearly.

### QA / Testing

-   [ ] End-to-end test: visuals generate → preview → schedule → publish
-   [ ] End-to-end test: threads generate → preview → schedule → publish

### Published Posts Pagination

-   [x] Add cursor pagination to `GET /scheduled-posts?status=published` on backend
-   [x] Frontend: PublishedTab fetches own data, load more appends + re-groups

### Standalone Visuals

-   [ ] Visuals not tied to a blog post (same pattern as standalone short posts + threads)

## 🟡 Active

### Thread Draft Click-to-Schedule

-   [x] Clicking a thread draft in DraftsTab should open SlotContentPicker with thread content pre-filled (short posts already do this)

### Visuals — Expand Format Options

-   [ ] More layout presets — quote card, stat card, list card
-   [ ] Text position options — top, bottom, center, overlay
-   [ ] AI-generated background image instead of gradient (endpoint already exists: `POST /image/generate`)

### Swipe File

-   [ ] Add more thread swipe examples in production DB

### Instagram / Social Publish Settings

-   [ ] `like_count_disabled` + `comments_disabled` on Instagram publish
-   [ ] Threads `reply_control` (everyone/followers/mentioned)
-   [ ] Twitter `reply_settings`
-   [ ] UI toggles in SchedulePostModal

## ⏳ Platform Approvals Needed

-   [ ] LinkedIn Community Management API — screencast of OAuth + publish flow
-   [ ] Twitter API — elevated access
-   [ ] Facebook/Instagram — App Review for `instagram_content_publish`
-   [ ] Threads — API access for production

## 🔵 Nice to Have (Later)

-   [ ] Optimistic updates — apply edits to UI immediately, revert on API error (ScheduledPostDetail save, short post edits, thread edits)
-   [ ] Webhook/SSE instead of polling for blog generation
-   [ ] Video tab
-   [ ] Version history modal (connect to real PostVersion data)
-   [ ] Swipe files / content library
-   [ ] Custom prompts per user
-   [ ] Queue pattern for `generate-outline` / `generate-topics`

## Completed

-   Thread publishing nginx timeout fix — `SocialPublishController` now dispatches job instead of running publish synchronously; diagnostic logs reduced to milestones
-   Thread hook syncs with first post on edit — `onEditPost` at index 0 now also updates `hook` in local state and API call

-   Language system (Phases 1–4): detection, content_lang selector, generation, Snelstack publish translation, WP sync translation — using `content_lang` from profile, no per-post language column needed
-   Auto-repost backend + frontend
-   TipTap AI bubble menu
-   Regenerate blog modal
-   WP posts sync (REST endpoint + frontend import logic)
-   Analytics page (overview chart + per-post growth)
-   SnelstackBanner extracted as reusable component
-   Standalone thread backend + frontend (GET/POST endpoints, DraftsTab, Form Requests)
-   `published_at` field on posts — synced from WordPress `post_date`, used for sorting + display
-   Per-post sync button on BlogsPage cards + BlogEditor (replaces delete on synced posts)
-   `scopeOrderByPublishedDate` on Post model (`COALESCE(published_at, created_at) DESC`)
-   Disconnect social account cleans up schedule slots
-   Thread draft click-to-schedule — DraftsTab thread cards open SlotContentPicker with hook + posts pre-filled
-   Queue tab: replaced infinite scroll with load more button (14 days default, infinite expand by 2 weeks)
-   Published tab: cursor pagination (20/page), own data fetch, client-side re-group on load more
