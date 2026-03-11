/**
 * COLOR UTILITIES
 * Generates visually distinct, beautiful colors for packages.
 */

const PALETTE = [
  "#FF6B6B", // coral red
  "#4ECDC4", // teal
  "#45B7D1", // sky blue
  "#96CEB4", // sage green
  "#FFEAA7", // warm yellow
  "#DDA0DD", // plum
  "#98D8C8", // mint
  "#F7DC6F", // gold
  "#BB8FCE", // lavender
  "#85C1E9", // light blue
  "#F0B27A", // peach
  "#82E0AA", // light green
  "#F1948A", // salmon
  "#85929E", // slate
  "#F8C471", // amber
  "#73C6B6", // aquamarine
];

export function getPackageColor(index) {
  return PALETTE[index % PALETTE.length];
}

export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 1, g: 1, b: 1 };
}

/** Darken a hex color by `amount` (0–1) */
export function darken(hex, amount = 0.2) {
  const { r, g, b } = hexToRgb(hex);
  const d = 1 - amount;
  const toHex = (v) => Math.round(v * d * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
