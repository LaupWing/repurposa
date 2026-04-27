# TODO

## 🔴 High Priority

### Language System
See [LANGUAGE.md](./LANGUAGE.md) for full design.

**Phase 1 — Detection + Config ✅ DONE**
- [x] PHP detection in `repurposa.php` (`snelstackLang` via `wp_localize_script`)
- [x] `SnelstackBanner` component in SettingsPage
- [x] Language selector in SettingsPage (`content_lang` saved to Laravel user profile)

**Phase 2 — Generation with Language**
- [x] Send `content_lang` from profile to Laravel on every generate/repurpose call (`AiController` reads `profile->content_lang`)
- [ ] Laravel migration: add `language` column to `posts` table (store at creation, not from profile)
- [ ] Show language badge on blog cards in BlogsPage

**Phase 3 — Publish Flow (Snelstack)**
- [x] On WP publish: check `snelstackLang` vs `content_lang` mismatch → auto-translates via `POST /api/translate`
- [x] Laravel `translate` endpoint: `{ content, target_lang }` → translated content
- [ ] UX: notice on publish confirmation "will be auto-translated EN → NL"
- [ ] UX: badge on blog card/detail after publish showing it was translated

**Phase 4 — Sync Flow**
- [x] On WP → Repurposa sync: detects `wp.lang` vs `content_lang` mismatch → translates before import
- [x] Non-Snelstack: uses `get_locale()`, fallback to en
- [ ] UX: badge on synced blog card "Synced from WordPress · Translated NL → EN"

## 🔴 Bug

### WP Sync — Thumbnail Not Updating
- [ ] After syncing a post from WordPress, the thumbnail doesn't update on the card or in the editor
- State updates directly from `wp.thumbnail` (not backend response) — still not reflecting
- Investigate: log `wp.thumbnail` to confirm new URL is returned; check if browser is caching old image at same URL; try cache-busting `?t=timestamp` on thumbnail src after sync

## Active

### Thread Draft Click-to-Schedule
- [ ] Clicking a thread draft in DraftsTab should open SlotContentPicker with thread content pre-filled (short posts already do this)

### Published Posts Pagination
- [ ] Add `?limit=20&page=1` (or cursor) to `GET /scheduled-posts` on backend
- [ ] Frontend: paginate published tab with "load more" on scroll

### Instagram / Social Publish Settings
- [ ] `like_count_disabled` + `comments_disabled` on Instagram publish
- [ ] Threads `reply_control` (everyone/followers/mentioned)
- [ ] Twitter `reply_settings`
- [ ] UI toggles in SchedulePostModal

## Platform Approvals Needed
- [ ] LinkedIn Community Management API — screencast of OAuth + publish flow
- [ ] Twitter API — elevated access
- [ ] Facebook/Instagram — App Review for `instagram_content_publish`
- [ ] Threads — API access for production

## Nice to Have (Later)
- [ ] Webhook/SSE instead of polling for blog generation
- [ ] Video tab
- [ ] Version history modal (connect to real PostVersion data)
- [ ] Swipe files / content library
- [ ] Custom prompts per user
- [ ] Queue pattern for `generate-outline` / `generate-topics`

## Completed
- Language Phase 1 (Snelstack detection, banner, content_lang selector)
- Auto-repost backend + frontend
- TipTap AI bubble menu
- Regenerate blog modal
- WP posts sync (REST endpoint + frontend import logic)
- Analytics page (overview chart + per-post growth)
- SnelstackBanner extracted as reusable component
- Standalone thread backend + frontend (GET/POST endpoints, DraftsTab, Form Requests)
- `published_at` field on posts — synced from WordPress `post_date`, used for sorting + display
- Per-post sync button on BlogsPage cards + BlogEditor (replaces delete on synced posts)
- `scopeOrderByPublishedDate` on Post model (`COALESCE(published_at, created_at) DESC`)
- Disconnect social account cleans up schedule slots
