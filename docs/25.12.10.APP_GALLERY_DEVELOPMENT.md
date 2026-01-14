## JSRApp Gallery - Further Development Ideas

### 1. Automatic example discovery
- **Goal**: Avoid hard-coding the list of apps in `jsrapp-gallery.html`.
- **Approach**:
  - Introduce a small build-time script (Node) that:
    - Scans `src/app/examples` for modules exporting a `JSRApp` subclass.
    - Instantiates each class once (in Node + jsdom or a very lightweight harness) to query metadata hooks like `getHelpTitle()`, `getHelpSummary()`, `getDocumentationLink()`, `getThumbnailPath()`.
    - Emits a JSON manifest (e.g. `docs/jsrapp-gallery.json`) and/or regenerates `jsrapp-gallery.html` from a template.
  - Optionally wire this into the existing build/test workflow.

### 2. Use JSRApp documentation hooks
- **Goal**: Make the gallery content driven directly by each app class.
- **Hooks already available on `JSRApp`**:
  - `getHelpTitle()` – human-readable title.
  - `getHelpSummary()` – short description.
  - `getDocumentationLink()` – URL or relative path to HTML docs.
  - `getThumbnailPath()` – relative path to a thumbnail image.
- **Gallery integration**:
  - When generating the manifest or HTML, call these methods on a temporary app instance.
  - Display title/summary in the card, show a "Docs" link if `getDocumentationLink()` is non-null.

### 3. Thumbnail/image generation
- **Goal**: Show a visual preview for each example.
- **Approach**:
  - Add a `scripts/capture-thumbnails.mjs` (Node + Playwright/Puppeteer):
    - Start the dev server at `http://localhost:8000` (or assume it is already running).
    - For each example entry (from the manifest):
      - Open `test/test-jsrapp-example.html?module=...&class=...` in a headless browser.
      - Wait until a simple readiness condition (e.g. a known DOM marker, or a short timeout).
      - Capture a screenshot of the viewer area and save to `resources/gallery/<ClassName>.png`.
  - Use `getThumbnailPath()` to point to that file.

### 4. Richer gallery UI
- **Filtering and searching**:
  - Allow filtering by category (e.g. geometry / tools / picking / shaders) via tags defined per app.
  - Support text search across titles and summaries.
- **Categories/tags**:
  - Add optional `getTags()` to `JSRApp` returning an array of strings; surface these in the gallery.
- **Inline docs**:
  - When `getDocumentationLink()` is relative and points to local HTML/markdown, show a "View Docs" button per card.

### 5. Deep-linking and bookmarking
- **Goal**: Stable, copy-pastable URLs for each app.
- **Approach**:
  - Keep the current query-parameter scheme, but also:
    - Add named anchors or a hash segment per example in `jsrapp-gallery.html`.
    - Optionally add a very small router script to sync selection state with `location.hash`.

### 6. Integration with assignment-style documentation (from Java `Assignment`)
- **Goal**: Mirror the Java `Assignment` documentation experience.
- **Ideas**:
  - For ported assignments, keep the same doc filenames or URLs and expose them via `getDocumentationLink()`.
  - Provide a small "Help" button in the runner page (`test-jsrapp-example.html`) that opens `getDocumentationLink()` in a new tab if available.

### 7. Testing & maintenance
- **Minimal tests**:
  - Ensure every example referenced by the gallery actually loads in `test-jsrapp-example.html` (e.g. simple Playwright test that checks for console errors and a non-empty viewer container).
  - Validate that thumbnails mentioned by `getThumbnailPath()` exist on disk.
- **Lints and CI**:
  - If a manifest is generated, add a check that `modulePath` and `className` still resolve (to catch renames).

These steps should give a clear path from the current hand-written gallery to a fully metadata-driven, screenshot-rich catalog of `JSRApp` examples.
