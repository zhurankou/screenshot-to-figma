/**
 * Pure color helpers. No Figma runtime dependency, so this module is safe to
 * import from the UI (validation) as well as the plugin controller (rendering).
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Accepts `#RGB`, `#RRGGBB`, `#RRGGBBAA` (case-insensitive, `#` optional). */
export function isHexColor(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.trim().replace(/^#/, "");
  return /^([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(normalized);
}

/** Returns rgb in 0..255 and alpha in 0..1. Throws on invalid input. */
export function hexToRgba(hex: string): Rgb & { a: number } {
  let normalized = hex.trim().replace(/^#/, "");
  if (!isHexColor(normalized)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const a = normalized.length === 8 ? parseInt(normalized.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

/** Builds a Figma SolidPaint from a hex color. `opacity` multiplies any alpha. */
export function hexToFigmaPaint(hex: string, opacity = 1): SolidPaint {
  const { r, g, b, a } = hexToRgba(hex);
  return {
    type: "SOLID",
    color: { r: r / 255, g: g / 255, b: b / 255 },
    opacity: Math.max(0, Math.min(1, a * opacity))
  };
}
