# Video Publishing

Backend: `app/Services/Media/VideoCompressor.php` + `app/Services/Social/Providers/ThreadsProvider.php`

---

## The UNKNOWN error (Threads)

Threads returns `status: ERROR` + `error_message: UNKNOWN` when their server-side fetcher can't download your video URL fast enough. The container fails at polling attempt 2 (~6s) — that's the fetch timeout, not a processing failure (real processing takes 25–30s).

**Root cause:** Meta's fetcher has an implicit download timeout. Files over ~8 MB served from a VPS with limited upload bandwidth time out before Meta finishes downloading them. This is undocumented — the official spec only says 1 GB max.

**Fix:** Target 2 Mbps so compressed files stay under ~6 MB regardless of video duration. A 24s video at 2 Mbps = ~6 MB → fetched well within the timeout.

---

## ffmpeg flags — why each one matters

| Flag | Why |
|------|-----|
| `scale='min(iw,1920)'` | Caps width at 1920px (Threads hard limit). Phone 4K = 2160px → instant UNKNOWN |
| `-r 30` | Forces CFR. Phone 4K videos are often VFR — Threads rejects VFR |
| `-pix_fmt yuv420p` + `-colorspace bt709 ...` | Strips HDR metadata (Dolby Vision/HDR10 in H.264 SEI NAL units causes UNKNOWN even when pix_fmt looks correct) |
| `-flags +cgop` | Closed GOP — required per Threads video spec |
| `-movflags +faststart` | Moov atom at front — required for URL-based validation |

---

## Bitrate targets per platform

| Platform | Threshold | Target | Why |
|----------|-----------|--------|-----|
| Threads | 8 Mbps | **2 Mbps** | Keep files < 6 MB for Meta's fetch timeout |
| Instagram REELS | 25 Mbps | 8 Mbps | Meta CDN handles larger files fine |

---

## Graceful fallback

If a video container returns UNKNOWN, `ThreadsProvider.publishThread()` catches it and retries the post as text-only, then continues the thread. A 23-post thread won't die because of one bad video.

---

## Storage

Files stored in Laravel `public/tmp/videos/` — Nginx serves them directly, no `storage:link` needed. Cleaned up via `finally` blocks after the platform API call. Cleanup key format: `local:tmp/videos/uuid.mp4`.

---

## ✅ Save-time compression — DONE 2026-05-03

VideoCompressor no longer runs inside the publish job. Flow:

1. Thread/short post saved → `CompressVideoJob` dispatched per video → runs on `compression` queue (max 2 workers)
2. Job compresses video, uploads to R2 `compressed/` folder, stores result in `compressed_videos` table
3. Publish job checks `compressed_videos` for all video URLs before proceeding — releases every 30s if not done yet (`retryUntil 30min`)
4. `ThreadsProvider::resolveVideoUrl()` looks up `compressed_url` from `CompressedVideo` — no ffmpeg at publish time

**Pending:** confirm Threads accepts `r2.dev` URLs. If UNKNOWN → add custom domain to R2 bucket.
