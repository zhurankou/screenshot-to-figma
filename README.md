# Screenshot to Figma

Rebuild UI screenshots as **editable Figma layers** by importing an AI-generated
structural reconstruction of the screen.

> **This is not a magic pixel-perfect converter.** It does not try to detect
> rectangles, colors, and text directly from pixels. Instead it imports a
> structured UI schema — JSON that an AI assistant (Claude, Codex, etc.)
> produces from your screenshot — and turns that schema into real, editable
> Figma nodes. The quality of the result depends on the quality of the schema.

## How it works

```text
Screenshot  →  Claude or Codex API  →  UI schema (JSON)  →  Editable Figma frame
```

1. You choose a screenshot in the plugin.
2. You pick a provider — **Claude (Anthropic)** or **Codex (OpenAI)** — and enter that provider's API key (stored locally, once each).
3. You click **Recreate in Figma**.
4. The plugin sends the screenshot to the chosen API, which returns a JSON UI schema.
5. The plugin validates the schema and renders it into an editable Figma frame,
   with the original screenshot kept behind it as a **locked reference layer**.

A Figma plugin cannot run Claude Code, Codex, or Figma MCP from inside Figma, so
the AI reconstruction is done by calling the provider's API directly from the
plugin UI (the iframe, which has network access). The schema is a clean,
well-defined intermediate format; the plugin renders it with the Figma Plugin API.

> **You pay for the API.** Calls are billed to your own Anthropic or OpenAI key.
> There is still **no backend and no account** for this plugin — the request goes
> straight from your machine to `api.anthropic.com` or `api.openai.com`, and your
> keys are stored only in Figma's local `clientStorage`.

## Using it

1. **Choose screenshot** — drag a PNG/JPG into the plugin, or click to pick one. Dimensions are detected.
2. **Pick a provider** — Claude (Anthropic) or Codex (OpenAI). The plugin remembers a separate key for each.
3. **Enter your API key** — [console.anthropic.com](https://console.anthropic.com) for Claude, [platform.openai.com](https://platform.openai.com) for OpenAI. Stored locally.
4. **Set the model** — defaults to `claude-sonnet-4-6` (Anthropic) or `gpt-4o` (OpenAI). The field is editable, so you can use any vision-capable model your key supports.
5. **Recreate in Figma** — the plugin calls the API, validates the result, and builds the frame, generated layers, and the locked screenshot reference, then selects and zooms to it.

### Manual / offline alternative (no API key)

The plugin also has an **Advanced: paste schema** section. Paste a UI schema
JSON and click **Create from schema** to render a frame with no API call —
useful if you don't have a key, or if you generated the schema elsewhere (Claude
Code, the Codex CLI, or by hand). Use
[`samples/reconstruction-prompt.txt`](samples/reconstruction-prompt.txt) to
produce one, or start from [`samples/`](samples/). If a screenshot is selected,
it's still added as the locked reference layer.

## The UI schema

```json
{
  "name": "Dashboard Screenshot Reconstruction",
  "width": 1440,
  "height": 900,
  "background": "#FFFFFF",
  "nodes": [
    {
      "type": "frame",
      "name": "Sidebar",
      "x": 0, "y": 0, "width": 280, "height": 900,
      "fill": "#111827",
      "children": []
    },
    {
      "type": "text",
      "name": "Page title",
      "x": 320, "y": 48, "width": 400, "height": 40,
      "text": "Analytics",
      "fontSize": 32, "fontWeight": 700, "color": "#111827"
    },
    {
      "type": "rectangle",
      "name": "Primary card",
      "x": 320, "y": 120, "width": 480, "height": 240,
      "fill": "#FFFFFF", "stroke": "#E5E7EB", "cornerRadius": 16
    }
  ]
}
```

### Supported node types

`frame`, `rectangle`, `text`, `imagePlaceholder`, `iconPlaceholder`, `divider`, `ellipse`.

Unsupported types are skipped with a warning rather than failing the import.

### Node properties

| Property | Applies to | Notes |
| --- | --- | --- |
| `name` | all | Layer name (defaults per type) |
| `x`, `y` | all | Position **relative to the parent** (top-level nodes are relative to the frame). Default `0`. |
| `width`, `height` | all | **Required**, positive numbers. |
| `fill` | shapes, frame | Hex color. |
| `stroke`, `strokeWidth` | shapes, frame | Hex color + border width (default `1`). |
| `cornerRadius` | rectangle-like | px. |
| `opacity` | all | `0`–`1`. |
| `children` | frame | Nested nodes. |
| `text` | text | **Required** for text nodes. |
| `fontSize`, `fontWeight`, `fontFamily` | text | Weight is numeric (400/500/700…). |
| `color` | text | Hex color. |
| `lineHeight` | text | px. |
| `textAlign` | text | `left` / `center` / `right` / `justified`. |
| `layout` | frame | Advisory hint (`none`/`horizontal`/`vertical`); the MVP uses absolute geometry. |

All coordinates are pixels. Colors must be hex strings (`#RGB`, `#RRGGBB`, or `#RRGGBBAA`).

### Samples

Ready-to-paste examples live in [`samples/`](samples/):

- `samples/dashboard.json`
- `samples/login.json`
- `samples/reconstruction-prompt.txt` — the exact prompt the plugin copies.

These are generated from the source of truth in `src/` via `npm run samples`,
so they always match the schema the plugin accepts.

## Validation

Before rendering, the schema is validated (in the UI and again in the plugin
controller). The importer checks that:

- `width` and `height` exist and are positive,
- `nodes` is an array,
- every node has a supported `type` and required geometry,
- colors are valid hex wherever used,
- text nodes contain non-empty `text`,
- unsupported nodes are **skipped with warnings**, not treated as fatal errors.

## Figma rendering

- A top-level frame is created matching the schema `width`/`height` and `name`.
- If enabled, the original screenshot is added as a **locked** full-frame image
  layer at the back.
- Generated layers are placed above it, preserving `x`/`y`/`width`/`height`.
- Fonts are loaded before any text is created, with graceful fallback (requested
  family/weight → Inter → editor default); fallbacks are reported as warnings.
- Layers can optionally be grouped, and debug labels can be added per node.
- The frame is selected and the viewport zooms to it; a summary notification is shown.

## Local development

```bash
npm install      # no runtime deps; dev-only toolchain (esbuild, typescript, vitest)
npm run dev      # watch-build dist/code.js and dist/ui.html
npm run build    # one-time production build
npm run test     # vitest unit tests (validation, normalization, colors)
npm run lint     # tsc --noEmit type-check
npm run samples  # regenerate samples/ from src/
```

The only runtime dependency is the provider API (`manifest.json` allows
`https://api.anthropic.com` and `https://api.openai.com`). There is no backend
and no bundled npm runtime dependency — the toolchain is dev-only.

## Load in Figma

1. `npm install`
2. `npm run build` (or keep `npm run dev` running)
3. In the Figma desktop app: **Plugins → Development → Import plugin from manifest…**
4. Select this repo's `manifest.json`.
5. Run **Plugins → Development → Screenshot to Figma**.

## Known limitations

- Fidelity depends entirely on the schema the AI produces; complex layouts may
  need manual cleanup.
- `imagePlaceholder` / `iconPlaceholder` render as neutral placeholder shapes —
  real images and icons are not reconstructed.
- The MVP uses absolute positioning, not Figma auto-layout.
- Fonts not installed in your Figma editor fall back to Inter.
- Each recreate is one API call billed to your key; larger screenshots cost
  more. The response is capped at 8192 tokens, so very dense screens may be
  truncated.
- The plugin calls the Anthropic / OpenAI **APIs** directly; it does not (and
  cannot) run Claude Code, the Codex CLI, or Figma MCP from inside Figma.
- OpenAI model IDs change over time; if `gpt-4o` is unavailable on your account,
  type a current vision-capable model name into the Model field.

## Roadmap

- Direct local companion app (screenshot → schema without manual copy/paste).
- HTML/CSS → schema converter.
- Browser-rendered web preview of the reconstruction before import.
- OCR-assisted text extraction.
- Figma MCP bridge running outside the plugin.
- Auto-layout reconstruction.
- Design token matching.
- Component matching against a library.
- Visual diff against the original screenshot.

## License

MIT
