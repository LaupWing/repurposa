# TODO

## 🔴 High Priority

### Language System
See [LANGUAGE.md](./LANGUAGE.md) for full design.

**Phase 1 — Detection + Config ✅ DONE**
- [x] PHP detection in `repurposa.php` (`snelstackLang` via `wp_localize_script`)
- [x] `SnelstackBanner` component in SettingsPage
- [x] Language selector in SettingsPage (`content_lang` saved to Laravel user profile)

**Phase 2 — Generation with Language**
- [ ] Laravel migration: add `language` column to `posts` table (store at creation, not from profile — profile can change)
- [ ] Send `content_lang` from profile to Laravel on every generate/repurpose call
- [ ] Laravel stores it on the post + uses it to select correct prompt folder (`resources/prompts/en/` or `nl/`)
- [ ] Show language badge on blog cards in BlogsPage

**Phase 3 — Publish Flow (Snelstack)**
- [ ] On WP publish: check `snelstackLang` vs post `language` mismatch
- [ ] If mismatch: call `POST /api/translate` (Gemini in Laravel) before publishing to WP
- [ ] Laravel `translate` endpoint: `{ content, target_lang }` → translated content
- [ ] UX: notice on publish confirmation "will be auto-translated EN → NL"
- [ ] UX: badge on blog card/detail after publish showing it was translated

**Phase 4 — Sync Flow**
- [ ] On WP → Repurposa sync: detect incoming post language
- [ ] If Snelstack + unsupported lang → translate to en before import
- [ ] If non-Snelstack → use `get_locale()`, fallback to en
- [ ] UX: badge on synced blog card "Synced from WordPress · Translated NL → EN"

## Active

### Delete Blog Confirmation Modal
- [ ] Replace browser `confirm()` in BlogsPage with a proper modal

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
