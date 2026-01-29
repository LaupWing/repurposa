# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run start    # Development mode with hot reload
npm run build    # Production build
npm run lint:js  # Run ESLint
```

The build outputs to `build/` directory (`index.js`, `index.css`, `index.asset.php`).

## Architecture Overview

This is a WordPress admin dashboard plugin with a React/TypeScript frontend for creating AI-assisted blog posts and repurposing them into tweets.

### Tech Stack
- **Frontend**: React (via `@wordpress/element`), TypeScript, Tailwind CSS v4, TipTap editor
- **Backend**: PHP WordPress plugin hooks
- **Build**: `@wordpress/scripts` (wp-scripts), PostCSS for Tailwind

### PHP → React Integration
The PHP plugin (`wordpress-blog-repurpose-plugin.php`) registers WordPress admin menu pages and renders a container div with `data-page` and optional `data-post-id` attributes. The React app (`src/index.tsx`) mounts to this div and reads these attributes to determine which page component to render.

### Page Routing
Routing is handled via WordPress admin menu slugs, not client-side routing:
- `blog-repurpose` → `BlogWizard` (3-step blog creation)
- `blog-repurpose-blogs` → `BlogsPage` (list) or `BlogViewPage` (single, when `post_id` param present)
- `blog-repurpose-schedule` → `SchedulePage`
- `blog-repurpose-connections` → `ConnectionsPage`

### Key Components
- **BlogWizard**: 3-step wizard (Topic → Rough Outline → Generated Outline) with state management
- **TiptapEditor**: Rich text editor with AI bubble menu actions (improve, rewrite, shorter, longer, fix)
- **Step components** use drag-and-drop via `@dnd-kit` for reordering outline items

### Path Aliases
TypeScript is configured with `@/*` mapping to `src/*` for imports.

### WordPress Constants
- `WBRP_VERSION` - Plugin version
- `WBRP_PLUGIN_DIR` - Server path to plugin directory
- `WBRP_PLUGIN_URL` - URL to plugin directory
