# Publishing to the Figma Community

There is no API or CLI to publish a Community plugin — submission is manual,
tied to your Figma account, and every plugin is reviewed by Figma. This is the
end-to-end checklist plus paste-ready listing copy.

## 0. Before you start

- [ ] You have a Figma account and the **desktop app** (publishing is desktop-only).
- [ ] Decide a public **support contact** (email or URL) for the listing.
- [ ] Read the key-testability note in section 4 — it's the most common reason
      AI/BYO-key plugins get bounced in review.

## 1. Build the production bundle

```bash
npm install
npm run build      # writes dist/code.js and dist/ui.html
```

`manifest.json` points at those two files. Commit the latest `dist/` (or rebuild
before publishing) so the registered plugin runs the current code.

## 2. Register the plugin (this assigns the real plugin id)

Our committed `manifest.json` uses a placeholder `"id": "screenshot-to-figma"`.
Figma issues a **numeric** id the first time the plugin is registered.

1. Figma desktop → **Plugins → Development → Import plugin from manifest…**
2. Select this repo's `manifest.json`.
3. Run it once locally (**Plugins → Development → Screenshot to Figma**) to confirm it loads.

When you publish (section 3), Figma writes the assigned numeric id back into the
manifest it stores. Update the repo's `manifest.json` `id` to that number so
local and published versions stay in sync.

## 3. Publish

1. Figma desktop → **Plugins → Development → Screenshot to Figma → Publish…**
   (or the menu's **Publish new release**).
2. Fill in the listing form using the copy in section 5.
3. Upload the assets from section 6.
4. Submit for review. Figma review typically takes a few business days.
5. After approval you control the public listing; future updates go through
   **Publish new release** with release notes.

## 4. Make it reviewable WITHOUT an API key (important)

Figma's reviewer runs the plugin and has no Anthropic/OpenAI key, so the auto
flow alone is untestable. Mitigations, in order of preference:

1. **Add a keyless "paste schema" path** (recommended). The plugin can accept a
   pasted UI schema and render it with no API call. This is also the no-key user
   path and the Claude Code / Codex-CLI workflow. (Ask the maintainer to enable
   the schema-paste escape hatch if it isn't in the build yet.)
2. **Give the reviewer a test schema** in the submission notes (see
   `samples/dashboard.json`) and step-by-step instructions.
3. **Provide a temporary, low-limit API key** in the private review notes (revoke
   after approval). Least preferred — costs money and is easy to forget to revoke.

Suggested reviewer note:

> This plugin reconstructs a screenshot into editable Figma layers. The "Recreate"
> step calls the Anthropic or OpenAI API with the user's own key. To test without
> a key, use the "Paste schema" option and paste the contents of
> `samples/dashboard.json`, then click Create — it renders the frame with no
> network call. Screenshots are only sent to the provider the user selects, using
> the user's own key; nothing is sent anywhere else.

## 5. Listing copy (paste-ready)

**Name**

```
Screenshot to Figma
```

**Tagline** (keep it short)

```
Turn UI screenshots into editable Figma layers using AI.
```

**Description** (Markdown supported)

```
Rebuild UI screenshots as editable Figma layers — not a flat image, but real
frames, rectangles, text, and placeholders you can edit.

How it works:
1. Choose a screenshot.
2. Pick a provider — Claude (Anthropic) or Codex (OpenAI) — and enter your own API key (stored locally).
3. Click "Recreate in Figma".

The plugin sends the screenshot to your chosen AI, which returns a structured UI
schema; the plugin then renders it as editable Figma nodes and keeps the original
screenshot behind them as a locked reference layer.

Bring your own API key:
- Calls are billed to your Anthropic or OpenAI account.
- Your key is stored only on your machine (Figma clientStorage) and is sent only
  to the provider you choose. No backend, no account, nothing else collected.

Good to know:
- This is not a pixel-perfect converter. Fidelity depends on the AI reconstruction.
- Image and icon placeholders are rendered as neutral shapes, not real assets.
- Larger screenshots cost more and may be truncated on very dense screens.
```

**Tags**

```
screenshot, ai, import, ui, wireframe, layout, claude, openai, design-to-code, prototyping
```

**Support contact**: your email or a link (e.g. a GitHub issues URL).

## 6. Assets (required by the form)

| Asset | Size | Notes |
| --- | --- | --- |
| Icon | 128 × 128 px | PNG/JPG. Starter: `assets/icon.svg` |
| Cover art | 1920 × 960 px | PNG/JPG. Starter: `assets/cover.svg` |
| Carousel images | ~1920 × 960 px | 1–5 screenshots of the plugin in use |

The `assets/*.svg` files are starting points. Figma's form takes **PNG/JPG**, so
export them first (open the SVG in Figma or a browser and export at the exact
pixel size). Replace them with real product screenshots when you have them.

## 7. Privacy / data disclosure

Because screenshots leave the user's machine, state this plainly in the listing
(the description above does). The `manifest.json` `networkAccess.reasoning` field
already documents it for the review tooling.
