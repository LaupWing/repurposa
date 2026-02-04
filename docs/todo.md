# TODO

## Active

### 1. Data Restructure — Move source of truth from WordPress to Laravel
**Status:** In progress
**Priority:** High
**Reference:** [docs/data-restructure.md](./data-restructure.md)

Move all data storage (blogs, tweets, profile, settings) from WordPress custom post types and options to the Laravel backend. WordPress becomes a thin client that only stores a Sanctum token and publishes final posts.

**Steps:**
- [x] Build WordPress auth flow (register/login popup → Sanctum token)
- [x] Move profile CRUD to Laravel API
- [x] Update `src/services/api.ts` to use Sanctum token auth (`Bearer {token}`)
- [x] Add connection status UI in plugin (connected/disconnected state)
- [x] Wire up wizard lifecycle (GET/POST/PUT `/api/wizard`) with resume support
- [x] Auto-save wizard fields (topic, target_audience, rough_outline, outline) on change
- [x] Lift Step1 local state (generatedTopics, topicHistory, topicHistoryIndex) into BlogWizard for persistence
- [x] Remove WordPress custom post types (`wbrp_blog`, `wbrp_tweet`)
- [x] Remove WordPress REST routes and callbacks for blogs and tweets
- [x] Wire up `POST /api/blog/generate-blog` to save finished blog from wizard (generates + saves + deletes wizard)
- [x] Wire up blog list page (`BlogsPage`) to use Laravel API (`GET /api/blogs`)
- [x] Wire up blog view page (`BlogViewPage`) to fetch from Laravel API (`GET /api/blogs/{id}`)
- [x] Wire up blog save (`BlogViewPage`) to use Laravel API (`PUT /api/blogs/{id}`)
- [x] Wire up blog delete to use Laravel API (`DELETE /api/blogs/{id}`)
- [ ] Wire up blog publish to create real WP post from Laravel data
- [ ] Move tweet CRUD to Laravel API (`GET/POST/DELETE /api/blogs/{id}/tweets`)
- [ ] Remove old tweet API calls from frontend
- [ ] Add delete blog confirmation modal (replace `confirm()` with proper modal)

### 2. OAuth — Social media connections
**Status:** Not started
**Priority:** High (depends on #1)

- [ ] Twitter/X OAuth via Laravel popup
- [ ] LinkedIn OAuth via Laravel popup
- [ ] Meta OAuth (Facebook, Instagram, Threads) via Laravel popup
- [ ] Store tokens per user in Laravel
- [ ] Update ConnectionsPage to use OAuth popups

### 3. Scheduling — Post queue and publishing
**Status:** Not started (currently mock data)
**Priority:** Medium (depends on #1 and #2)

- [ ] `scheduled_posts` table + model in Laravel
- [ ] Publishing times storage per user
- [ ] Laravel queue jobs to post at scheduled times
- [ ] Update SchedulePage to use real data from Laravel API

### 4. Payments — Subscription/billing
**Status:** Not started
**Priority:** Low (depends on #1)

- [ ] Stripe integration in Laravel
- [ ] Plan/tier system
- [ ] Usage limits per plan
- [ ] Billing UI (likely on Laravel web app, not in WP plugin)

## Completed

- Auth flow (register/login popup → Sanctum token storage)
- Profile CRUD moved to Laravel API
- Sanctum token auth in `api.ts`
- ConnectAccount screen for disconnected state
- Wizard API integration (create, resume, auto-save all fields)
- Step 1 state lifted for persistence (generatedTopics, topicHistory)
- Step 2 rough outline auto-save + edit functionality
- Step 3 outline auto-save (reorder, edit, delete)
- Removed `wbrp_blog` and `wbrp_tweet` custom post types
- Removed all WordPress REST routes/callbacks for blogs and tweets
