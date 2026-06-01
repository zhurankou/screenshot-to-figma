import { describe, expect, it } from "vitest";
import { validateSchema } from "../src/schema/validateSchema";
import { sampleSchemas } from "../src/schema/sampleSchemas";

describe("validateSchema", () => {
  it("accepts a minimal valid schema", () => {
    const result = validateSchema({
      name: "Test",
      width: 100,
      height: 100,
      nodes: [{ type: "rectangle", x: 0, y: 0, width: 50, height: 50, fill: "#FFFFFF" }]
    });
    expect(result.valid).toBe(true);
    expect(result.schema?.nodes).toHaveLength(1);
  });

  it("parses a JSON string input", () => {
    const result = validateSchema('{"width":10,"height":10,"nodes":[]}');
    expect(result.valid).toBe(true);
  });

  it("reports invalid JSON", () => {
    const result = validateSchema("{ not json }");
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/Invalid JSON/);
  });

  it("requires width and height", () => {
    const result = validateSchema({ nodes: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("width"))).toBe(true);
    expect(result.errors.some((e) => e.message.includes("height"))).toBe(true);
  });

  it("rejects non-hex colors", () => {
    const result = validateSchema({
      width: 10,
      height: 10,
      nodes: [{ type: "rectangle", width: 5, height: 5, fill: "red" }]
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("hex"))).toBe(true);
  });

  it("requires text content on text nodes", () => {
    const result = validateSchema({
      width: 10,
      height: 10,
      nodes: [{ type: "text", width: 5, height: 5 }]
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("text"))).toBe(true);
  });

  it("skips unsupported node types as warnings, not errors", () => {
    const result = validateSchema({
      width: 10,
      height: 10,
      nodes: [
        { type: "video", width: 5, height: 5 },
        { type: "rectangle", width: 5, height: 5, fill: "#000000" }
      ]
    });
    expect(result.valid).toBe(true);
    expect(result.stats.skipped).toBe(1);
    expect(result.schema?.nodes).toHaveLength(1);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("validates nested children recursively", () => {
    const result = validateSchema({
      width: 10,
      height: 10,
      nodes: [
        {
          type: "frame",
          width: 10,
          height: 10,
          children: [{ type: "text", width: 5, height: 5 }]
        }
      ]
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].path).toContain("children[0]");
  });

  it("validates the bundled sample schemas", () => {
    for (const schema of Object.values(sampleSchemas)) {
      expect(validateSchema(schema).valid).toBe(true);
    }
  });
});
