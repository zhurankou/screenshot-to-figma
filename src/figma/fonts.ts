/**
 * Safe font loading for the plugin controller. Figma requires a font to be
 * loaded before it can be assigned to a text node, and not every family/style
 * is available. We map a numeric weight to candidate style names and fall back
 * gracefully (requested family -> Inter -> the document's default font).
 */

export interface LoadedFont {
  font: FontName;
  /** True when we could not honor the requested family/weight exactly. */
  usedFallback: boolean;
}

function styleCandidates(weight: number): string[] {
  if (weight >= 800) {
    return ["Black", "Extra Bold", "Bold", "Semi Bold", "Medium", "Regular"];
  }
  if (weight >= 700) {
    return ["Bold", "Semi Bold", "Medium", "Regular"];
  }
  if (weight >= 600) {
    return ["Semi Bold", "Bold", "Medium", "Regular"];
  }
  if (weight >= 500) {
    return ["Medium", "Semi Bold", "Regular"];
  }
  if (weight <= 300) {
    return ["Light", "Regular"];
  }
  return ["Regular", "Medium"];
}

async function tryLoad(family: string, style: string): Promise<FontName | null> {
  try {
    const font = { family, style };
    await figma.loadFontAsync(font);
    return font;
  } catch {
    return null;
  }
}

const FAMILY_FALLBACKS = ["Inter", "Roboto"];

export async function loadFontForWeight(family: string, weight: number): Promise<LoadedFont> {
  const styles = styleCandidates(weight);
  const families = [family, ...FAMILY_FALLBACKS.filter((f) => f !== family)];

  for (let fi = 0; fi < families.length; fi += 1) {
    const fam = families[fi];
    for (const style of styles) {
      const font = await tryLoad(fam, style);
      if (font) {
        // Fallback if we changed family, or had to drop to "Regular" for a bold request.
        const usedFallback = fam !== family || (weight >= 600 && style === "Regular");
        return { font, usedFallback };
      }
    }
  }

  // Last resort: whatever the editor offers as a default.
  const fallback = { family: "Inter", style: "Regular" };
  try {
    await figma.loadFontAsync(fallback);
  } catch {
    // Inter Regular is bundled with Figma; if even this fails there is nothing else to try.
  }
  return { font: fallback, usedFallback: true };
}
