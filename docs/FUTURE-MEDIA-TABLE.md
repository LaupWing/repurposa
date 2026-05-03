# Future: Proper Media Table Migration

## The Problem

Media (images, videos) are currently stored as plain URL strings inside JSON columns:

- `threads.posts[n].media` → `[{ url, type, mime }]`
- `short_posts.media` → `[{ url, type, mime }]`

There is no relational media model. URLs are denormalized into JSON blobs. This means:
- No deduplication — same file uploaded twice = two separate URL strings
- No usage tracking — can't find all posts using a given file
- No metadata in one place — mime, size, dimensions scattered or missing
- Compression workaround (`compressed_videos` table) uses URL as join key instead of a proper FK

## What the Right Model Looks Like

A proper `media` table as the single source of truth:

```
media
├── id
├── user_id
├── original_url        (R2 or WP media library URL)
├── compressed_url      (nullable — Threads-specific compressed version)
├── compression_status  (nullable | pending | done | failed)
├── mime_type
├── size
├── width               (nullable)
├── height              (nullable)
├── disk                (r2 | local)
├── r2_key              (nullable — for deletion)
└── timestamps
```

Posts reference media by ID instead of embedding URL strings:

```
thread_post_media (pivot)
├── id
├── thread_id
├── post_index          (which post in the thread array)
├── media_id            (FK → media.id)
└── sort_order
```

```
short_post_media (pivot)
├── id
├── short_post_id
├── media_id
└── sort_order
```

## Migration Path (when you do this)

1. Create `media` table + pivot tables
2. Backfill: scan all `threads.posts` + `short_posts.media` JSON, create `media` rows for each URL, create pivot rows
3. Update `SchedulableContentResolver` to load media via relation instead of JSON
4. Update `ThreadsProvider` to use `$media->compressed_url ?? $media->original_url`
5. Update frontend to work with media IDs (or keep URL-based API and resolve IDs server-side)
6. Drop `compressed_videos` table — fold `compressed_url` + `compression_status` into `media`
7. Remove raw `media` JSON columns from `threads` + `short_posts`

## Why Not Now

- Requires changing JSON structure in all existing threads + short posts
- Frontend currently sends/receives raw URL arrays — API contract would change
- `compressed_videos` table solves the immediate problem (Threads video timeout) without this refactor
- Do this when adding a media library UI, deduplication, or bulk media management

## ⚠️ Don't Add More JSON Media Fields

Every new field added to the `media` array in `threads.posts` or `short_posts.media` makes this migration harder. Keep the JSON shape as `{ url, type, mime }` only.
