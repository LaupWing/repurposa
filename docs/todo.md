# TODO

## Active

### 1. Data Restructure — Move source of truth from WordPress to Laravel
**Status:** Not started
**Priority:** High
**Reference:** [docs/data-restructure.md](./data-restructure.md)

Move all data storage (blogs, tweets, profile, settings) from WordPress custom post types and options to the Laravel backend. WordPress becomes a thin client that only stores a Sanctum token and publishes final posts.

**Steps:**
- [ ] Build WordPress auth flow (register/login popup → Sanctum token)
- [ ] Move profile CRUD to Laravel API
- [ ] Move blog CRUD to Laravel API
- [ ] Move tweet CRUD to Laravel API
- [ ] Update `src/services/api.ts` to use Sanctum token auth
- [ ] Remove WordPress custom post types and REST routes
- [ ] Add connection status UI in plugin (connected/disconnected state)

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

_(none yet)_
