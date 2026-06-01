# Submission notes for Figma review

Paste this into the "Notes for reviewers" field when publishing. It lets the
reviewer verify the plugin with **no API key**.

---

**What this plugin does**

Reconstructs a UI screenshot into editable Figma layers (frames, rectangles,
text, placeholders), keeping the original screenshot as a locked reference layer.

**Testing without an API key**

The "Recreate in Figma" button calls the Anthropic or OpenAI API using the
user's own key, so it isn't testable without one. To verify the core behavior
without a key, use the keyless path:

1. Open the plugin.
2. Expand **"Advanced: paste schema (no API key)"** below the Recreate button.
3. Paste the JSON below into the text area.
4. Click **Create from schema**.

A frame named "Analytics Dashboard" should appear on the canvas with a sidebar,
title, metric card, value text, and a chart placeholder — all editable. No
network request is made on this path.

```json
{
  "name": "Analytics Dashboard",
  "width": 1440,
  "height": 900,
  "background": "#F9FAFB",
  "nodes": [
    { "type": "frame", "name": "Sidebar", "x": 0, "y": 0, "width": 280, "height": 900, "fill": "#111827" },
    { "type": "text", "name": "Page title", "x": 320, "y": 48, "width": 400, "height": 40, "text": "Overview", "fontSize": 32, "fontWeight": 700, "color": "#111827" },
    { "type": "rectangle", "name": "Metric card", "x": 320, "y": 120, "width": 360, "height": 160, "fill": "#FFFFFF", "stroke": "#E5E7EB", "cornerRadius": 16 },
    { "type": "text", "name": "Metric value", "x": 344, "y": 176, "width": 240, "height": 48, "text": "12,480", "fontSize": 40, "fontWeight": 700, "color": "#111827" },
    { "type": "imagePlaceholder", "name": "Chart", "x": 712, "y": 120, "width": 688, "height": 320, "cornerRadius": 16 }
  ]
}
```

**Data & privacy**

- Screenshots are sent only to the provider the user selects (Anthropic or
  OpenAI), authenticated with the user's own API key.
- The API key is stored only in Figma `clientStorage` on the user's machine.
- No backend, no account, no analytics; nothing else is transmitted.
- Declared network domains: `api.anthropic.com`, `api.openai.com`.
