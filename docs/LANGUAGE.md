# Language System

## Overview

Repurposa supports `nl` and `en` only. Language detection happens once in PHP on page load and flows downstream — React and Laravel just consume it. One chokepoint, no scattered checks.

Snelstack theme = full language flow. Any other theme = skip, publish as-is.

---

## Detection (The Strait of Hormuz)

All detection lives in `repurposa.php` and is passed via `wp_localize_script` into `repurposaConfig`.

```php
'language' => [
    'current'      => 'en',         // Repurposa's active language (from plugin settings, default en)
    'isSnelstack'  => true,         // Whether Snelstack theme is active
    'siteDefault'  => 'nl',         // Theme default lang (only set if Snelstack, else null)
]
```

**Detection logic:**
```php
$is_snelstack   = function_exists('snel_get_lang');
$site_default   = $is_snelstack ? apply_filters('snel_seo_current_language', 'en') : null;
$repurposa_lang = get_option('repurposa_language', 'en'); // plugin setting, nl or en
```

---

## Flow 1 — Repurposa → WordPress Publish

```
Generate blog (nl or en)
        ↓
Is Snelstack active?
  NO  → publish as-is
  YES → does Repurposa lang match site default?
          YES → publish as-is
          NO  → translate to site default lang via AI → then publish
```

---

## Flow 2 — WordPress → Repurposa Sync

```
WP post incoming
        ↓
Is Snelstack active?
  NO  → detect lang via get_locale() → if nl/en use it, else force en → import
  YES → read site default lang
          nl or en → import as-is
          other (es, de...) → translate to en → import
```

---

## Laravel Changes

### Migration
Add `language` column to `posts` table — store it at creation time so Phase 3/4 know the post's language even if the user later changes their profile setting:
```php
$table->string('language', 10)->default('en');
```

### API
Every generate/repurpose call receives `language` param from the plugin (read from `profile.content_lang`). Laravel selects prompt folder based on it (`resources/prompts/en/` or `resources/prompts/nl/`). Already supported by `Prompts::get()`.

### Translation endpoint (new)
`POST /api/translate` — takes `content` + `target_lang`, returns translated content via AI (Gemini, reuse existing AI service).
Used by both publish flow and sync flow when lang mismatch detected.
Translation stays in Laravel — keep all AI in one place.

---

## UX Indicators (to design later)

Users need to know when translation happened. Two scenarios:

**Publish flow (Repurposa → WP)**
- Badge or notice on the publish confirmation: "Content will be auto-translated from EN → NL before publishing to your Snelstack site."
- After publish: show on blog card/detail that it was translated on publish.

**Sync flow (WP → Repurposa)**
- Badge on imported blog card: "Synced from WordPress · Translated NL → EN"
- Lets the user know the content they see in Repurposa is a translated version of the original WP post.

Keep it subtle — a small badge/label is enough. Not a modal, not blocking.

---

## Plugin Settings

Add language selector in SettingsPage (nl / en). Saved to WordPress options as `repurposa_language`. Passed in `repurposaConfig.language.current`.

---

## Implementation Phases

### Phase 1 — Detection + Config (HIGH PRIORITY)
- [ ] PHP detection in `repurposa.php` (`isSnelstack`, `siteDefault`, `current`)
- [ ] Pass via `wp_localize_script` into `repurposaConfig.language`
- [ ] Language selector in SettingsPage (nl/en, saved to `repurposa_language` option)
- [ ] Laravel migration: add `language` to `posts` table
- [ ] Update `PostApiController` store/update to accept `language`

### Phase 2 — Generation with Language
- [ ] Send `repurposaConfig.language.current` to Laravel on every generate/repurpose call
- [ ] Laravel uses it to select correct prompt folder
- [ ] Show language badge on blog cards in BlogsPage

### Phase 3 — Publish Flow (Snelstack)
- [ ] On publish: check `isSnelstack` + lang mismatch
- [ ] If mismatch: call `POST /api/translate` before publishing
- [ ] Laravel `translate` endpoint (AI translation, reuses existing AI service)

### Phase 4 — Sync Flow
- [ ] On sync: detect incoming post language
- [ ] If Snelstack + unsupported lang → translate to en before import
- [ ] If non-Snelstack → use `get_locale()`, fallback to en
