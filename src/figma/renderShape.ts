import type { NormalizedNode } from "../types/schema";
import { hexToFigmaPaint } from "./colors";

/** Applies geometry, fill, stroke, corner radius and opacity shared by shapes. */
function applyBox(shape: RectangleNode | EllipseNode, node: NormalizedNode): void {
  shape.name = node.name;
  shape.x = node.x;
  shape.y = node.y;
  shape.resize(Math.max(0.01, node.width), Math.max(0.01, node.height));
  shape.opacity = node.opacity;

  shape.fills = node.fill ? [hexToFigmaPaint(node.fill)] : [];

  if (node.stroke) {
    shape.strokes = [hexToFigmaPaint(node.stroke)];
    shape.strokeWeight = node.strokeWidth > 0 ? node.strokeWidth : 1;
  } else {
    shape.strokes = [];
  }

  if ("cornerRadius" in shape && node.cornerRadius > 0) {
    (shape as RectangleNode).cornerRadius = node.cornerRadius;
  }
}

/**
 * Renders the non-text, non-container node types:
 * rectangle, ellipse, divider, imagePlaceholder, iconPlaceholder.
 * Returns the created node WITHOUT appending it to a parent.
 */
export function renderShape(node: NormalizedNode): SceneNode {
  if (node.type === "ellipse") {
    const ellipse = figma.createEllipse();
    applyBox(ellipse, node);
    return ellipse;
  }

  // rectangle, divider, imagePlaceholder, iconPlaceholder all map to a rectangle.
  const rect = figma.createRectangle();
  applyBox(rect, node);
  return rect;
}
