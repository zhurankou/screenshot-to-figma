import type { RenderOptions, RenderSummary } from "../messages";
import { normalizeSchema } from "../schema/normalizeSchema";
import type { UISchema } from "../types/schema";
import { hexToFigmaPaint } from "./colors";
import { renderImageReference } from "./renderImageReference";
import type { RenderContext } from "./renderNode";
import { renderNode } from "./renderNode";

export interface CreateFrameInput {
  schema: UISchema;
  options: RenderOptions;
  imageBytes?: Uint8Array;
}

async function loadDebugFont(): Promise<FontName | null> {
  try {
    const font = { family: "Inter", style: "Regular" };
    await figma.loadFontAsync(font);
    return font;
  } catch {
    return null;
  }
}

/**
 * Renders a validated schema into the current page as an editable frame.
 *
 * Layer order (back to front): locked screenshot reference (optional),
 * then the generated layers (optionally wrapped in a single group).
 */
export async function createFrameFromSchema(input: CreateFrameInput): Promise<RenderSummary> {
  const schema = normalizeSchema(input.schema);
  const { options } = input;

  const frame = figma.createFrame();
  frame.name = schema.name;
  frame.resize(Math.max(1, schema.width), Math.max(1, schema.height));
  frame.fills = schema.background ? [hexToFigmaPaint(schema.background)] : [hexToFigmaPaint("#FFFFFF")];
  frame.clipsContent = false;

  const ctx: RenderContext = {
    created: 0,
    byType: {},
    warnings: new Set<string>(),
    debugLabels: options.debugLabels,
    debugFont: options.debugLabels ? await loadDebugFont() : null
  };

  // Locked reference goes in first so it sits at the back.
  if (options.includeReference && input.imageBytes && input.imageBytes.length > 0) {
    try {
      const reference = renderImageReference(input.imageBytes, schema.width, schema.height);
      frame.appendChild(reference);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown error";
      ctx.warnings.add(`Could not add screenshot reference: ${detail}`);
    }
  }

  const generated: SceneNode[] = [];
  for (const node of schema.nodes) {
    const created = await renderNode(frame, node, ctx);
    if (created) {
      generated.push(created);
    }
  }

  if (options.group && generated.length > 1) {
    const group = figma.group(generated, frame);
    group.name = "Generated Layers";
  }

  figma.currentPage.appendChild(frame);
  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);

  return {
    frameName: frame.name,
    width: schema.width,
    height: schema.height,
    created: ctx.created,
    byType: ctx.byType,
    skipped: 0,
    warnings: Array.from(ctx.warnings)
  };
}
