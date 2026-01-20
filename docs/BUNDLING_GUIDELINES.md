# Bundling Guidelines

These guidelines summarize when to stay un-bundled, when to bundle, and how to
keep a future migration simple.

## Un-bundled (static) mode

**Use when:**
- Serving directly from repo (GitHub Pages or local static server).
- Iterating quickly without a build step.

**Pros:**
- Zero build tooling required.
- Straightforward file URLs and import maps.
- Easy to debug with source files as-is.

**Cons:**
- No cache-busting fingerprints for assets.
- More network requests (many modules).
- Paths are sensitive to deployment base URLs.

## Bundled mode

**Use when:**
- Shipping as a distributable app or library.
- Performance and caching are priorities.
- You need minification/transpilation/asset pipelines.

**Pros:**
- Fingerprinted assets for cache safety.
- Fewer network requests and smaller payloads.
- Optional transpilation for broader browser support.

**Cons:**
- Requires build tooling and a deploy step.
- Must configure base paths for GitHub Pages.

## Keep migration easy later

Follow these now to simplify bundling later:
- Prefer ES module imports (no globals or script tags).
- Avoid dynamic import paths built from strings.
- Keep static assets in one place (`src/assets` or a top-level `assets/` folder).
- Reference assets consistently (either by relative URL or via imports).
- Avoid hard-coded absolute paths in HTML/JS.

## Suggested structure (un-bundled)

- `src/` for code
- `assets/` for images/fonts you want to serve by URL
- `test/` for demo HTML files

If you later adopt bundling, you can move assets to `src/assets/` and import them
from JS, or keep a `public/` folder for unprocessed files.
