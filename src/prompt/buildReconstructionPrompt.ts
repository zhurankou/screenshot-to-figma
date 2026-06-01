import { SUPPORTED_NODE_TYPES } from "../types/schema";

export interface PromptOptions {
  /** If known (e.g. from the uploaded screenshot), pins the output dimensions. */
  width?: number;
  height?: number;
}

/**
 * Builds the prompt the user copies into Claude / Codex alongside their
 * screenshot. The schema rules are embedded so the model has everything it
 * needs in one paste. Output must be raw JSON — no HTML, no markdown.
 */
export function buildReconstructionPrompt(options: PromptOptions = {}): string {
  const dimsLine =
    options.width && options.height
      ? `The screenshot is ${Math.round(options.width)} x ${Math.round(options.height)} pixels. Use these as the schema "width" and "height".`
      : `Estimate the pixel dimensions of the screenshot and use them as the schema "width" and "height".`;

  return `Analyze this UI screenshot and recreate it as a structured JSON layout for a Figma plugin.

Do not return HTML. Do not return markdown. Do not include explanations or code fences. Return ONLY valid JSON matching the schema below.

${dimsLine}

SCHEMA SHAPE
{
  "name": string,                // a short title for the design
  "width": number,               // frame width in px
  "height": number,              // frame height in px
  "background": "#RRGGBB",        // optional frame background color
  "nodes": Node[]                // the layers, in back-to-front order
}

Each Node:
{
  "type": ${SUPPORTED_NODE_TYPES.map((t) => `"${t}"`).join(" | ")},
  "name": string,                // human-readable layer name
  "x": number,                   // left, relative to the parent container
  "y": number,                   // top, relative to the parent container
  "width": number,
  "height": number,
  "fill": "#RRGGBB",             // optional solid fill
  "stroke": "#RRGGBB",           // optional border color
  "strokeWidth": number,          // optional border width (default 1)
  "cornerRadius": number,         // optional
  "opacity": number,              // optional, 0..1
  "children": Node[]             // optional; only "frame" nodes group children
}

Text nodes ("type":"text") also support:
{
  "text": string,                // REQUIRED, the visible string
  "fontSize": number,
  "fontWeight": number,           // 400 regular, 500 medium, 700 bold
  "fontFamily": string,           // e.g. "Inter"
  "color": "#RRGGBB",
  "lineHeight": number,           // px
  "textAlign": "left" | "center" | "right" | "justified"
}

RULES
- Output ONE JSON object. No prose, no markdown, no comments, no trailing commas.
- Use only the node types listed above.
- All colors must be hex strings like "#1A2B3C".
- Coordinates are in pixels. x/y are relative to the node's parent (top-level nodes are relative to the frame).
- Order nodes back-to-front: backgrounds and containers first, foreground text and icons last.
- Use "frame" for grouped containers (cards, sidebars, sections) and nest their contents in "children".
- Use "rectangle" for cards, buttons, and input fields (set fill, stroke, cornerRadius to match).
- Use "text" for every visible label, heading, paragraph, or button label. Copy the real text.
- Use "imagePlaceholder" for photos/avatars/illustrations and "iconPlaceholder" for icons.
- Use "divider" for thin separator lines and "ellipse" for circular shapes.
- Approximate sizes and positions from the screenshot as closely as you can.
- Do not invent content that is not visible in the screenshot.`;
}
