# Submission notes for Figma review

Paste this into the "Notes for reviewers" field when publishing.

---

**What this plugin does**

Reconstructs a UI screenshot into editable Figma layers (frames, rectangles,
text, placeholders), keeping the original screenshot as a locked reference layer.

**How to test it**

The "Recreate in Figma" button calls an AI provider's API to reconstruct the
screenshot, authenticated with the user's own API key. To let you test it at no
cost, use the **Gemini free tier**:

1. Create a free key at https://aistudio.google.com/apikey (no billing required), or
   use the temporary key below (we will revoke it after review).
2. Open the plugin.
3. Select provider **Gemini (Google, free tier)** and paste the key.
4. Click **Choose screenshot**, pick any UI screenshot (e.g. a PNG of a web page).
5. Click **Recreate in Figma**.

A frame matching the screenshot should appear on the canvas as editable layers,
with the original screenshot behind it as a locked reference layer. The plugin
auto-selects an available vision model, so no model needs to be entered.

> Temporary Gemini API key for review: `<paste a free-tier key here, then revoke after approval>`

**Data & privacy**

- The screenshot is sent only to the provider the user selects (Anthropic,
  OpenAI, or Google Gemini), authenticated with the user's own API key.
- The API key is stored only in Figma `clientStorage` on the user's machine.
- No backend, no account, no analytics; nothing else is transmitted.
- Declared network domains: `api.anthropic.com`, `api.openai.com`,
  `generativelanguage.googleapis.com`.
