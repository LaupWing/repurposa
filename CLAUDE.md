# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run start    # Development mode with hot reload
npm run build    # Production build
npm run lint:js  # Run ESLint
npm run zip      # Build production zip for release (see Versioning below)
```

The build outputs to `build/` directory (`index.js`, `index.css`, `index.asset.php`).

## Versioning & Releases

**IMPORTANT: Always bump the version before committing a release.**

The version lives in two places — keep them in sync:
1. `repurposa.php` — `* Version: x.x.x` in the plugin header
2. `package.json` — `"version": "x.x.x"` (the zip script syncs this automatically)

### Shipping a new version

1. Bump the version in `repurposa.php`
2. Run `npm run zip` — this builds assets, installs prod composer deps, and outputs `dist/repurposa-{version}.zip`
3. Commit and push
4. Create a GitHub release tagged `v{version}` and attach the zip as a release asset

WordPress sites with the plugin installed will then see the update notification automatically via the built-in GitHub update checker.

### GitHub token
The repo is public so no token is needed. If the repo ever goes private, add this to `wp-config.php` on each site:
```php
define( 'REPURPOSA_GITHUB_TOKEN', 'your_token_here' );
```

## Architecture Overview

This is a WordPress admin dashboard plugin (Repurposa) with a React/TypeScript frontend for creating AI-assisted blog posts and repurposing them into social media content.

### Tech Stack
- **Frontend**: React (via `@wordpress/element`), TypeScript, Tailwind CSS v4, TipTap editor
- **Backend**: PHP WordPress plugin hooks
- **Build**: `@wordpress/scripts` (wp-scripts), PostCSS for Tailwind

### PHP → React Integration
The PHP plugin (`repurposa.php`) registers WordPress admin menu pages and renders a container div with `data-page` and optional `data-post-id` attributes. The React app (`src/index.tsx`) mounts to this div and reads these attributes to determine which page component to render.

### Page Routing
Routing is handled via WordPress admin menu slugs, not client-side routing:
- `repurposa` → `BlogWizard` (3-step blog creation)
- `repurposa-blogs` → `BlogsPage` (list) or `BlogViewPage` (single, when `post_id` param present)
- `repurposa-schedule` → `SchedulePage`
- `repurposa-settings` → `SettingsPage`
- `repurposa-analytics` → `AnalyticsPage`

### Key Components
- **BlogWizard**: 3-step wizard (Topic → Rough Outline → Generated Outline) with state management
- **TiptapEditor**: Rich text editor with AI bubble menu actions (improve, rewrite, shorter, longer, fix)
- **Step components** use drag-and-drop via `@dnd-kit` for reordering outline items

### Path Aliases
TypeScript is configured with `@/*` mapping to `src/*` for imports.

### WordPress Constants
- `REPURPOSA_VERSION` - Plugin version
- `REPURPOSA_PLUGIN_DIR` - Server path to plugin directory
- `REPURPOSA_PLUGIN_URL` - URL to plugin directory
