import type { NormalizedNode, TextAlign } from "../types/schema";
import { hexToFigmaPaint } from "./colors";
import { loadFontForWeight } from "./fonts";

function alignToFigma(align: TextAlign): "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED" {
  switch (align) {
    case "center":
      return "CENTER";
    case "right":
      return "RIGHT";
    case "justified":
      return "JUSTIFIED";
    default:
      return "LEFT";
  }
}

export interface RenderTextResult {
  node: TextNode;
  fontFallback: boolean;
}

export async function renderText(node: NormalizedNode): Promise<RenderTextResult> {
  const text = figma.createText();
  text.name = node.name;

  const { font, usedFallback } = await loadFontForWeight(node.fontFamily, node.fontWeight);
  text.fontName = font;
  text.fontSize = node.fontSize;
  text.characters = node.text;

  // Fix the box to the schema geometry rather than auto-resizing to content.
  text.textAutoResize = "NONE";
  text.x = node.x;
  text.y = node.y;
  text.resize(Math.max(1, node.width), Math.max(1, node.height));

  text.textAlignHorizontal = alignToFigma(node.textAlign);
  if (node.lineHeight) {
    text.lineHeight = { unit: "PIXELS", value: node.lineHeight };
  }
  text.fills = [hexToFigmaPaint(node.color, node.opacity)];

  return { node: text, fontFallback: usedFallback };
}
