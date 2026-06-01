/**
 * Places the original screenshot as a locked, full-frame reference layer.
 * Returns the created rectangle so the caller can keep it at the back.
 */
export function renderImageReference(
  imageBytes: Uint8Array,
  width: number,
  height: number
): RectangleNode {
  const image = figma.createImage(imageBytes);
  const reference = figma.createRectangle();
  reference.name = "Screenshot Reference (locked)";
  reference.x = 0;
  reference.y = 0;
  reference.resize(Math.max(1, width), Math.max(1, height));
  reference.fills = [
    {
      type: "IMAGE",
      scaleMode: "FILL",
      imageHash: image.hash
    }
  ];
  reference.locked = true;
  return reference;
}
