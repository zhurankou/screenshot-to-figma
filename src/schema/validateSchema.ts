import { isHexColor } from "../figma/colors";
import type { SchemaNode, SchemaNodeType, TextAlign, UISchema } from "../types/schema";
import { SUPPORTED_NODE_TYPES } from "../types/schema";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /**
   * The cleaned schema: present whenever there are no fatal errors.
   * Unsupported nodes are dropped (and reported as warnings), not fatal.
   */
  schema: UISchema | null;
  stats: {
    totalNodes: number;
    skipped: number;
    byType: Record<string, number>;
  };
}

const SUPPORTED = new Set<string>(SUPPORTED_NODE_TYPES);
const TEXT_ALIGNS = new Set<string>(["left", "center", "right", "justified"]);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface Ctx {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  byType: Record<string, number>;
  total: number;
  skipped: number;
}

function checkColor(ctx: Ctx, value: unknown, path: string, field: string): void {
  if (value === undefined || value === null) {
    return;
  }
  if (!isHexColor(value)) {
    ctx.errors.push({
      path,
      message: `"${field}" must be a hex color like "#1A2B3C" (got ${JSON.stringify(value)}).`
    });
  }
}

function validateNode(ctx: Ctx, raw: unknown, path: string): SchemaNode | null {
  if (!isObject(raw)) {
    ctx.errors.push({ path, message: "Node must be an object." });
    return null;
  }

  ctx.total += 1;
  const type = raw.type;

  if (typeof type !== "string" || !SUPPORTED.has(type)) {
    ctx.skipped += 1;
    ctx.warnings.push({
      path,
      message: `Unsupported node type ${JSON.stringify(type)}. Skipping. Supported: ${SUPPORTED_NODE_TYPES.join(", ")}.`
    });
    return null;
  }

  const nodeType = type as SchemaNodeType;
  ctx.byType[nodeType] = (ctx.byType[nodeType] || 0) + 1;

  // Geometry. width/height are required; x/y default to 0 during normalization.
  if (!isFiniteNumber(raw.width) || raw.width <= 0) {
    ctx.errors.push({ path, message: `"width" must be a positive number.` });
  }
  if (!isFiniteNumber(raw.height) || raw.height <= 0) {
    ctx.errors.push({ path, message: `"height" must be a positive number.` });
  }
  if (raw.x !== undefined && !isFiniteNumber(raw.x)) {
    ctx.errors.push({ path, message: `"x" must be a number.` });
  }
  if (raw.y !== undefined && !isFiniteNumber(raw.y)) {
    ctx.errors.push({ path, message: `"y" must be a number.` });
  }

  checkColor(ctx, raw.fill, path, "fill");
  checkColor(ctx, raw.stroke, path, "stroke");

  if (raw.opacity !== undefined && (!isFiniteNumber(raw.opacity) || raw.opacity < 0 || raw.opacity > 1)) {
    ctx.errors.push({ path, message: `"opacity" must be a number between 0 and 1.` });
  }

  if (nodeType === "text") {
    if (typeof raw.text !== "string" || raw.text.trim().length === 0) {
      ctx.errors.push({ path, message: `Text node "${path}" must have non-empty "text" content.` });
    }
    checkColor(ctx, raw.color, path, "color");
    if (raw.fontSize !== undefined && (!isFiniteNumber(raw.fontSize) || raw.fontSize <= 0)) {
      ctx.errors.push({ path, message: `"fontSize" must be a positive number.` });
    }
    if (raw.textAlign !== undefined && !TEXT_ALIGNS.has(String(raw.textAlign))) {
      ctx.warnings.push({
        path,
        message: `Unknown "textAlign" ${JSON.stringify(raw.textAlign)}. Falling back to "left".`
      });
    }
  }

  // Children: only meaningful for containers, but validated wherever present.
  let children: SchemaNode[] | undefined;
  if (raw.children !== undefined) {
    if (!Array.isArray(raw.children)) {
      ctx.errors.push({ path, message: `"children" must be an array.` });
    } else {
      children = [];
      raw.children.forEach((child, i) => {
        const validated = validateNode(ctx, child, `${path} > children[${i}]`);
        if (validated) {
          children!.push(validated);
        }
      });
    }
  }

  // Return a shallow, type-narrowed copy. Defaults are applied later by normalizeSchema.
  const node = { ...(raw as object) } as SchemaNode;
  if (children) {
    node.children = children;
  }
  if (raw.textAlign !== undefined && !TEXT_ALIGNS.has(String(raw.textAlign))) {
    delete (node as { textAlign?: TextAlign }).textAlign;
  }
  return node;
}

/** Validates raw input (a JSON string or a parsed object) against the UI schema. */
export function validateSchema(input: unknown): ValidationResult {
  const ctx: Ctx = { errors: [], warnings: [], byType: {}, total: 0, skipped: 0 };

  let root: unknown = input;
  if (typeof input === "string") {
    try {
      root = JSON.parse(input);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown parse error.";
      return {
        valid: false,
        errors: [{ path: "$", message: `Invalid JSON: ${detail}` }],
        warnings: [],
        schema: null,
        stats: { totalNodes: 0, skipped: 0, byType: {} }
      };
    }
  }

  if (!isObject(root)) {
    return {
      valid: false,
      errors: [{ path: "$", message: "Schema root must be a JSON object." }],
      warnings: [],
      schema: null,
      stats: { totalNodes: 0, skipped: 0, byType: {} }
    };
  }

  if (!isFiniteNumber(root.width) || root.width <= 0) {
    ctx.errors.push({ path: "$", message: `"width" must be a positive number.` });
  }
  if (!isFiniteNumber(root.height) || root.height <= 0) {
    ctx.errors.push({ path: "$", message: `"height" must be a positive number.` });
  }
  checkColor(ctx, root.background, "$", "background");
  if (root.name !== undefined && typeof root.name !== "string") {
    ctx.warnings.push({ path: "$", message: `"name" should be a string.` });
  }

  const cleanNodes: SchemaNode[] = [];
  if (!Array.isArray(root.nodes)) {
    ctx.errors.push({ path: "$", message: `"nodes" must be an array.` });
  } else if (root.nodes.length === 0) {
    ctx.warnings.push({ path: "$", message: `"nodes" is empty — the frame will have no generated layers.` });
  } else {
    root.nodes.forEach((node, i) => {
      const validated = validateNode(ctx, node, `nodes[${i}]`);
      if (validated) {
        cleanNodes.push(validated);
      }
    });
  }

  const valid = ctx.errors.length === 0;
  const schema: UISchema | null = valid
    ? {
        name: typeof root.name === "string" ? root.name : "Screenshot Reconstruction",
        width: root.width as number,
        height: root.height as number,
        background: isHexColor(root.background) ? (root.background as string) : undefined,
        nodes: cleanNodes
      }
    : null;

  return {
    valid,
    errors: ctx.errors,
    warnings: ctx.warnings,
    schema,
    stats: { totalNodes: ctx.total, skipped: ctx.skipped, byType: ctx.byType }
  };
}
