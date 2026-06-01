import type { NormalizedNode } from "../types/schema";
import { hexToFigmaPaint } from "./colors";
import { renderShape } from "./renderShape";
import { renderText } from "./renderText";

export interface RenderContext {
  created: number;
  byType: Record<string, number>;
  warnings: Set<string>;
  debugLabels: boolean;
  /** Preloaded font used for debug labels (null if loading failed). */
  debugFont: FontName | null;
}

function count(ctx: RenderContext, node: NormalizedNode): void {
  ctx.created += 1;
  ctx.byType[node.type] = (ctx.byType[node.type] || 0) + 1;
}

function addDebugLabel(parent: BaseNode & ChildrenMixin, node: NormalizedNode, font: FontName): void {
  const label = figma.createText();
  label.fontName = font;
  label.fontSize = 9;
  label.characters = `${node.type}: ${node.name}`;
  label.textAutoResize = "WIDTH_AND_HEIGHT";
  label.x = node.x;
  label.y = Math.max(0, node.y - 12);
  label.fills = [hexToFigmaPaint("#DB2777")];
  label.name = "debug label";
  parent.appendChild(label);
}

/**
 * Creates a single node (recursing into `frame` children) and appends it to
 * `parent`. Returns the created node, or null if it could not be created.
 */
export async function renderNode(
  parent: BaseNode & ChildrenMixin,
  node: NormalizedNode,
  ctx: RenderContext
): Promise<SceneNode | null> {
  let created: SceneNode;

  if (node.type === "text") {
    const result = await renderText(node);
    if (result.fontFallback) {
      ctx.warnings.add(`Font "${node.fontFamily}" (weight ${node.fontWeight}) was unavailable; used a fallback.`);
    }
    created = result.node;
  } else if (node.type === "frame") {
    const frame = figma.createFrame();
    frame.name = node.name;
    frame.x = node.x;
    frame.y = node.y;
    frame.resize(Math.max(0.01, node.width), Math.max(0.01, node.height));
    frame.opacity = node.opacity;
    frame.clipsContent = false;
    frame.fills = node.fill ? [hexToFigmaPaint(node.fill)] : [];
    if (node.stroke) {
      frame.strokes = [hexToFigmaPaint(node.stroke)];
      frame.strokeWeight = node.strokeWidth > 0 ? node.strokeWidth : 1;
    }
    if (node.cornerRadius > 0) {
      frame.cornerRadius = node.cornerRadius;
    }
    parent.appendChild(frame);
    count(ctx, node);

    for (const child of node.children) {
      await renderNode(frame, child, ctx);
    }
    if (ctx.debugLabels && ctx.debugFont) {
      addDebugLabel(parent, node, ctx.debugFont);
    }
    return frame;
  } else {
    created = renderShape(node);
  }

  parent.appendChild(created);
  count(ctx, node);
  if (ctx.debugLabels && ctx.debugFont) {
    addDebugLabel(parent, node, ctx.debugFont);
  }
  return created;
}
