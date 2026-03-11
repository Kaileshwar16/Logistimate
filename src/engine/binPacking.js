/**
 * BIN PACKING ENGINE
 * 3D Bin Packing using a Best-Fit Decreasing (BFD) heuristic
 * with guillotine-cut space splitting and 6-rotation support.
 *
 * Architecture:
 *   packItems(container, packages) → PackingResult
 *   - Sorts packages by volume (largest first)
 *   - Iterates free-space list, finding best-fit space per item
 *   - Tries all 6 axis-aligned rotations
 *   - Splits remaining free space via guillotine cuts
 */

// ─── Types (JSDoc for clarity) ────────────────────────────────────────────────
/**
 * @typedef {{ w: number, h: number, d: number }} Dims
 * @typedef {{ x: number, y: number, z: number } & Dims} Space
 * @typedef {{ id: string, dims: Dims, label: string }} Package
 * @typedef {{ packageId: string, label: string, position: {x,y,z}, rotation: Dims, rotationLabel: string }} Placement
 * @typedef {{ placements: Placement[], unplaced: string[], utilization: number, freeSpaces: Space[] }} PackingResult
 */

// ─── Rotation helpers ─────────────────────────────────────────────────────────

/** All 6 unique axis-aligned rotations of a box */
export function getRotations({ w, h, d }) {
  return [
    { w, h, d, label: "W×H×D" },
    { w: w, h: d, d: h, label: "W×D×H" },
    { w: h, h: w, d: d, label: "H×W×D" },
    { w: h, h: d, d: w, label: "H×D×W" },
    { w: d, h: w, d: h, label: "D×W×H" },
    { w: d, h: h, d: w, label: "D×H×W" },
  ];
}

/** Does rotation `rot` fit inside space `space`? */
function fits(rot, space) {
  return rot.w <= space.w && rot.h <= space.h && rot.d <= space.d;
}

// ─── Guillotine split ─────────────────────────────────────────────────────────

/**
 * After placing a box at the origin of `space`, split the remaining
 * volume into up to 3 sub-spaces (largest-remainder strategy).
 */
function splitSpace(space, rot) {
  const rw = space.w - rot.w;
  const rh = space.h - rot.h;
  const rd = space.d - rot.d;

  const newSpaces = [];

  // Right remainder
  if (rw > 0)
    newSpaces.push({ x: space.x + rot.w, y: space.y, z: space.z, w: rw, h: space.h, d: space.d });

  // Top remainder
  if (rh > 0)
    newSpaces.push({ x: space.x, y: space.y + rot.h, z: space.z, w: rot.w, h: rh, d: space.d });

  // Depth remainder
  if (rd > 0)
    newSpaces.push({ x: space.x, y: space.y, z: space.z + rot.d, w: rot.w, h: rot.h, d: rd });

  return newSpaces;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/** Score a (space, rotation) pair — lower is better (less wasted space). */
function score(space, rot) {
  const waste = space.w * space.h * space.d - rot.w * rot.h * rot.d;
  return waste;
}

// ─── Main packing function ────────────────────────────────────────────────────

/**
 * Pack `packages` into `container`.
 * @param {{ length: number, width: number, height: number }} container
 * @param {Array<{ id: string, length: number, width: number, height: number, quantity?: number }>} rawPackages
 * @returns {PackingResult}
 */
export function packItems(container, rawPackages) {
  const containerVol = container.length * container.width * container.height;

  // Expand quantities and normalise dims
  const packages = [];
  rawPackages.forEach((pkg) => {
    const qty = pkg.quantity || 1;
    for (let q = 0; q < qty; q++) {
      packages.push({
        id: `${pkg.id}-${q}`,
        baseId: pkg.id,
        label: qty > 1 ? `${pkg.label} #${q + 1}` : pkg.label,
        dims: { w: pkg.length, h: pkg.height, d: pkg.width },
        volume: pkg.length * pkg.width * pkg.height,
      });
    }
  });

  // Sort: largest volume first (BFD heuristic)
  packages.sort((a, b) => b.volume - a.volume);

  // Initial free space = entire container
  let freeSpaces = [
    { x: 0, y: 0, z: 0, w: container.length, h: container.height, d: container.width },
  ];

  const placements = [];
  const unplaced = [];

  for (const pkg of packages) {
    let bestScore = Infinity;
    let bestSpace = null;
    let bestRot = null;
    let bestSpaceIdx = -1;

    // Find best (space, rotation) pair
    freeSpaces.forEach((space, idx) => {
      for (const rot of getRotations(pkg.dims)) {
        if (fits(rot, space)) {
          const s = score(space, rot);
          if (s < bestScore) {
            bestScore = s;
            bestSpace = space;
            bestRot = rot;
            bestSpaceIdx = idx;
          }
        }
      }
    });

    if (!bestSpace) {
      unplaced.push(pkg.id);
      continue;
    }

    // Place the package
    placements.push({
      packageId: pkg.id,
      baseId: pkg.baseId,
      label: pkg.label,
      position: { x: bestSpace.x, y: bestSpace.y, z: bestSpace.z },
      rotation: { w: bestRot.w, h: bestRot.h, d: bestRot.d },
      rotationLabel: bestRot.label,
      volume: pkg.volume,
      color: pkg.color,
    });

    // Replace used space with split sub-spaces
    const newSpaces = splitSpace(bestSpace, bestRot);
    freeSpaces.splice(bestSpaceIdx, 1, ...newSpaces);

    // Merge / prune tiny spaces
    freeSpaces = freeSpaces
      .filter((s) => s.w > 0.001 && s.h > 0.001 && s.d > 0.001)
      .sort((a, b) => b.w * b.h * b.d - a.w * a.h * a.d);
  }

  const usedVol = placements.reduce((sum, p) => sum + p.volume, 0);

  return {
    placements,
    unplaced,
    utilization: usedVol / containerVol,
    freeSpaces,
    containerVol,
    usedVol,
  };
}
