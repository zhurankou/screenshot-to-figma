import { describe, expect, it } from "vitest";
import { normalizeSchema } from "../src/schema/normalizeSchema";

describe("normalizeSchema", () => {
  it("defaults x/y to 0 and opacity to 1", () => {
    const result = normalizeSchema({
      name: "T",
      width: 10,
      height: 10,
      nodes: [{ type: "rectangle", width: 5, height: 5 }]
    });
    const node = result.nodes[0];
    expect(node.x).toBe(0);
    expect(node.y).toBe(0);
    expect(node.opacity).toBe(1);
  });

  it("clamps opacity into 0..1", () => {
    const result = normalizeSchema({
      name: "T",
      width: 10,
      height: 10,
      nodes: [{ type: "rectangle", width: 5, height: 5, opacity: 4 }]
    });
    expect(result.nodes[0].opacity).toBe(1);
  });

  it("applies type-specific default fills", () => {
    const result = normalizeSchema({
      name: "T",
      width: 10,
      height: 10,
      nodes: [
        { type: "imagePlaceholder", width: 5, height: 5 },
        { type: "rectangle", width: 5, height: 5 }
      ]
    });
    expect(result.nodes[0].fill).toBe("#E5E7EB");
    expect(result.nodes[1].fill).toBe("#FFFFFF");
  });

  it("does not add a default fill to outline-only nodes", () => {
    const result = normalizeSchema({
      name: "T",
      width: 10,
      height: 10,
      nodes: [{ type: "rectangle", width: 5, height: 5, stroke: "#000000" }]
    });
    expect(result.nodes[0].fill).toBeUndefined();
    expect(result.nodes[0].strokeWidth).toBe(1);
  });

  it("applies text defaults", () => {
    const result = normalizeSchema({
      name: "T",
      width: 10,
      height: 10,
      nodes: [{ type: "text", width: 5, height: 5, text: "Hi" }]
    });
    const node = result.nodes[0];
    expect(node.fontSize).toBe(16);
    expect(node.fontWeight).toBe(400);
    expect(node.fontFamily).toBe("Inter");
    expect(node.color).toBe("#111827");
    expect(node.textAlign).toBe("left");
  });

  it("normalizes children recursively", () => {
    const result = normalizeSchema({
      name: "T",
      width: 10,
      height: 10,
      nodes: [{ type: "frame", width: 10, height: 10, children: [{ type: "rectangle", width: 2, height: 2 }] }]
    });
    expect(result.nodes[0].children[0].fill).toBe("#FFFFFF");
  });
});
