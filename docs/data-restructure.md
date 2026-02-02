# Data Restructure: WordPress → Laravel as Source of Truth

## Overview

Currently all data (blogs, tweets, profile/settings) is stored locally in WordPress custom post types and options. This operation moves the source of truth to the Laravel backend so we can support user accounts, OAuth, scheduling, and payments.

## Current State (WordPress stores everything)

| Data | Storage | Method |
|---|---|---|
| Blogs | `wbrp_blog` custom post type | WordPress DB |
| Tweets | `wbrp_tweet` custom post type (post_parent = blog) | WordPress DB |
| Profile | `wbrp_profile` in `wp_options` | WordPress DB |
| Published posts | Regular WordPress `post` type | WordPress DB |

## Target State (Laravel stores everything, WordPress is a thin client)

| Data | Storage | Method |
|---|---|---|
| User account | `users` + `user_profiles` table | Laravel DB |
| Blogs | `posts` + `post_versions` table | Laravel DB |
| Tweets | New table or existing `short_post_swipes` | Laravel DB |
| Profile/Settings | `user_profiles` table | Laravel DB |
| OAuth tokens | New table (per user, per platform) | Laravel DB |
| Schedule/Queue | Laravel jobs + new `scheduled_posts` table | Laravel DB |
| Payments/Subscription | New table (Stripe integration) | Laravel DB |
| Published WP posts | Regular WordPress `post` type | WordPress DB (stays) |

## What WordPress Plugin Becomes

- Stores **one thing**: the Sanctum API token in `wp_options`
- All data reads/writes go through Laravel API (`Authorization: Bearer {token}`)
- Only writes to WordPress DB when publishing a final blog post
- No more custom post types for storage

## API Changes

### Authentication
- **Before:** `X-API-Key: test-key-12345` (shared, no user identity)
- **After:** `Authorization: Bearer {sanctum_token}` (per-user)

### Endpoints Needed on Laravel

#### Auth (new)
- `GET /auth/wordpress/register` — Register page (popup)
- `POST /auth/wordpress/register` — Create account, return Sanctum token
- `GET /auth/wordpress/login` — Login page (popup)
- `POST /auth/wordpress/login` — Validate credentials, return Sanctum token
- `GET /auth/wordpress/callback` — PostMessage token back to plugin, close popup

#### Blogs (move from WordPress REST → Laravel API)
- `GET /api/blogs` — List user's blogs
- `POST /api/blogs` — Create blog
- `GET /api/blogs/{id}` — Get single blog
- `PUT /api/blogs/{id}` — Update blog (title, content, thumbnail, status)
- `DELETE /api/blogs/{id}` — Delete blog

#### Tweets (move from WordPress REST → Laravel API)
- `GET /api/blogs/{id}/tweets` — Get tweets for a blog
- `POST /api/blogs/{id}/tweets` — Save tweets for a blog
- `DELETE /api/blogs/{id}/tweets` — Delete tweets for a blog

#### Profile (move from WordPress REST → Laravel API)
- `GET /api/profile` — Get user profile
- `POST /api/profile` — Save/update profile

#### OAuth (new)
- `GET /auth/{platform}/redirect` — Start OAuth flow (popup)
- `GET /auth/{platform}/callback` — Receive OAuth token
- `GET /api/connections` — List connected platforms
- `DELETE /api/connections/{platform}` — Disconnect platform

#### Scheduling (new)
- `GET /api/schedule/queue` — Get scheduled posts
- `POST /api/schedule/queue` — Add post to queue
- `PUT /api/schedule/queue/{id}` — Update scheduled post
- `DELETE /api/schedule/queue/{id}` — Remove from queue
- `GET /api/schedule/times` — Get publishing times
- `POST /api/schedule/times` — Save publishing times

## WordPress Plugin Changes

### Remove
- `wbrp_blog` custom post type registration
- `wbrp_tweet` custom post type registration
- All `/wbrp/v1/blogs/*` REST routes
- All `/wbrp/v1/blogs/{id}/tweets/*` REST routes
- `/wbrp/v1/profile` REST routes (GET, POST, DELETE)
- All blog/tweet CRUD callback functions

### Keep
- Admin menu page registration (pages still render React)
- Script/style enqueuing
- WordPress media library integration
- Blog publish endpoint (creates real WP post from Laravel data)

### Add
- `/wbrp/v1/auth/token` REST route — Store/retrieve Sanctum token in wp_options
- `/wbrp/v1/auth/status` REST route — Check if connected to Laravel

### Modify (src/services/api.ts)
- Base URL: from hardcoded `localhost:8000` to configurable Laravel URL
- Auth header: from `X-API-Key` to `Authorization: Bearer {token}`
- All blog/tweet/profile calls now go to Laravel instead of WordPress REST API

## Laravel Changes

### Add
- WordPress auth controller (register, login, callback pages)
- Blog CRUD API controller (replaces WordPress REST)
- Tweet CRUD API controller (replaces WordPress REST)
- Profile API controller (replaces WordPress REST)
- OAuth controllers per platform
- Scheduling controller + models + jobs
- CORS configuration for WordPress origins

### Modify
- API routes: switch from `api.key` middleware to `auth:sanctum`
- Existing `posts` table/model already supports blogs (may need minor adjustments)

## Migration Order

1. **Auth flow** — WordPress plugin ↔ Laravel account connection
2. **Profile** — Move profile CRUD to Laravel API
3. **Blogs** — Move blog CRUD to Laravel API
4. **Tweets** — Move tweet CRUD to Laravel API
5. **OAuth** — Social media connections via Laravel
6. **Scheduling** — Queue + publishing times via Laravel
7. **Payments** — Stripe integration (future)
8. **Cleanup** — Remove old WordPress custom post types and REST routes
