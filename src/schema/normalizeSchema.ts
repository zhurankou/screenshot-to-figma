import type {
  NormalizedNode,
  NormalizedSchema,
  SchemaNode,
  SchemaNodeType,
  TextAlign,
  UISchema
} from "../types/schema";

/** Default solid fills so nodes are never accidentally invisible. */
const DEFAULT_FILL: Partial<Record<SchemaNodeType, string>> = {
  rectangle: "#FFFFFF",
  ellipse: "#FFFFFF",
  imagePlaceholder: "#E5E7EB",
  iconPlaceholder: "#D1D5DB",
  divider: "#E5E7EB"
};

const DEFAULT_CORNER_RADIUS: Partial<Record<SchemaNodeType, number>> = {
  imagePlaceholder: 8,
  iconPlaceholder: 6
};

function clampOpacity(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 1;
  }
  return Math.max(0, Math.min(1, value));
}

function defaultName(type: SchemaNodeType): string {
  switch (type) {
    case "frame":
      return "Container";
    case "rectangle":
      return "Rectangle";
    case "text":
      return "Text";
    case "imagePlaceholder":
      return "Image";
    case "iconPlaceholder":
      return "Icon";
    case "divider":
      return "Divider";
    case "ellipse":
      return "Ellipse";
    default:
      return "Layer";
  }
}

function normalizeNode(node: SchemaNode): NormalizedNode {
  const type = node.type;

  // A fill is applied if the schema specifies one, OR a type-specific default
  // exists and the node has no stroke (so an outline-only node stays outline-only).
  let fill = node.fill;
  if (fill === undefined && node.stroke === undefined) {
    fill = DEFAULT_FILL[type];
  }

  return {
    type,
    name: node.name && node.name.trim().length > 0 ? node.name : defaultName(type),
    x: typeof node.x === "number" ? node.x : 0,
    y: typeof node.y === "number" ? node.y : 0,
    width: node.width,
    height: node.height,
    fill,
    stroke: node.stroke,
    strokeWidth: typeof node.strokeWidth === "number" ? node.strokeWidth : node.stroke ? 1 : 0,
    cornerRadius:
      typeof node.cornerRadius === "number" ? node.cornerRadius : DEFAULT_CORNER_RADIUS[type] ?? 0,
    opacity: clampOpacity(node.opacity),
    text: typeof node.text === "string" ? node.text : "",
    fontSize: typeof node.fontSize === "number" && node.fontSize > 0 ? node.fontSize : 16,
    fontWeight: typeof node.fontWeight === "number" ? node.fontWeight : 400,
    fontFamily: node.fontFamily && node.fontFamily.trim().length > 0 ? node.fontFamily : "Inter",
    color: node.color || "#111827",
    lineHeight: typeof node.lineHeight === "number" && node.lineHeight > 0 ? node.lineHeight : undefined,
    textAlign: (node.textAlign as TextAlign) || "left",
    layout: node.layout || "none",
    children: Array.isArray(node.children) ? node.children.map(normalizeNode) : []
  };
}

/** Fills in rendering defaults so the renderers never see `undefined`. */
export function normalizeSchema(schema: UISchema): NormalizedSchema {
  return {
    name: schema.name && schema.name.trim().length > 0 ? schema.name : "Screenshot Reconstruction",
    width: schema.width,
    height: schema.height,
    background: schema.background,
    nodes: schema.nodes.map(normalizeNode)
  };
}
