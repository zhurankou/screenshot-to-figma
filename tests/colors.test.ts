import { describe, expect, it } from "vitest";
import { hexToFigmaPaint, hexToRgba, isHexColor } from "../src/figma/colors";

describe("color helpers", () => {
  it("recognizes valid hex colors", () => {
    expect(isHexColor("#FFF")).toBe(true);
    expect(isHexColor("#1a2b3c")).toBe(true);
    expect(isHexColor("1A2B3C")).toBe(true);
    expect(isHexColor("#11223344")).toBe(true);
  });

  it("rejects invalid hex colors", () => {
    expect(isHexColor("blue")).toBe(false);
    expect(isHexColor("#12")).toBe(false);
    expect(isHexColor("#GGGGGG")).toBe(false);
    expect(isHexColor(123)).toBe(false);
  });

  it("expands shorthand hex", () => {
    expect(hexToRgba("#0AF")).toEqual({ r: 0, g: 170, b: 255, a: 1 });
  });

  it("parses alpha from 8-digit hex", () => {
    const { a } = hexToRgba("#000000FF");
    expect(a).toBe(1);
  });

  it("builds a normalized Figma paint", () => {
    const paint = hexToFigmaPaint("#FF0000");
    expect(paint.type).toBe("SOLID");
    expect(paint.color).toEqual({ r: 1, g: 0, b: 0 });
    expect(paint.opacity).toBe(1);
  });
});
