/**
 * UI schema types.
 *
 * This is the intermediate format the plugin imports. It is intentionally
 * simple so an AI assistant (Claude, Codex, etc.) can reliably generate it
 * from a screenshot, and so the plugin can map it directly onto Figma nodes.
 *
 * Coordinate system: `x`/`y` are relative to the node's direct parent. For
 * top-level nodes that parent is the root frame, so they are effectively
 * absolute within the frame. For children, they are relative to the container.
 */

export type SchemaNodeType =
  | "frame"
  | "rectangle"
  | "text"
  | "imagePlaceholder"
  | "iconPlaceholder"
  | "divider"
  | "ellipse";

export const SUPPORTED_NODE_TYPES: SchemaNodeType[] = [
  "frame",
  "rectangle",
  "text",
  "imagePlaceholder",
  "iconPlaceholder",
  "divider",
  "ellipse"
];

export type TextAlign = "left" | "center" | "right" | "justified";

/** Optional, advisory layout hint. The MVP renderer uses absolute geometry. */
export type LayoutHint = "none" | "horizontal" | "vertical";

export interface SchemaNode {
  type: SchemaNodeType;
  name?: string;
  x?: number;
  y?: number;
  width: number;
  height: number;

  // Shared visual properties.
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  opacity?: number;

  // Text-only properties.
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  color?: string;
  lineHeight?: number;
  textAlign?: TextAlign;

  // Containers.
  layout?: LayoutHint;
  children?: SchemaNode[];
}

export interface UISchema {
  name: string;
  width: number;
  height: number;
  background?: string;
  nodes: SchemaNode[];
}

/**
 * A schema where rendering defaults have been resolved. Produced by
 * `normalizeSchema`. The renderers consume this shape so they never have to
 * deal with `undefined` visual properties.
 */
export interface NormalizedNode {
  type: SchemaNodeType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth: number;
  cornerRadius: number;
  opacity: number;
  text: string;
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  color: string;
  lineHeight?: number;
  textAlign: TextAlign;
  layout: LayoutHint;
  children: NormalizedNode[];
}

export interface NormalizedSchema {
  name: string;
  width: number;
  height: number;
  background?: string;
  nodes: NormalizedNode[];
}
