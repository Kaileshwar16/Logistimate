import { useRef, useEffect, useState, useCallback } from "react";

// ── Isometric projection helpers ─────────────────────────────────────────────
const ISO_ANGLE = Math.PI / 6; // 30°
const SCALE = 1;

function toIso(x, y, z) {
  return {
    sx: (x - z) * Math.cos(ISO_ANGLE),
    sy: (x + z) * Math.sin(ISO_ANGLE) - y,
  };
}

// ── Draw a single isometric box ───────────────────────────────────────────────
function drawIsoBox(ctx, cx, cy, w, h, d, color, alpha = 1, isGhost = false) {
  const scale = 2.2;
  w *= scale; h *= scale; d *= scale;

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = isGhost ? "rgba(0,212,255,0.6)" : "rgba(0,0,0,0.5)";
  ctx.lineWidth = isGhost ? 2 : 1.5;

  // Top face
  ctx.beginPath();
  const t = toIso(0, h, 0);
  const tr = toIso(w, h, 0);
  const tf = toIso(w, h, d);
  const tl = toIso(0, h, d);
  ctx.moveTo(cx + t.sx, cy + t.sy);
  ctx.lineTo(cx + tr.sx, cy + tr.sy);
  ctx.lineTo(cx + tf.sx, cy + tf.sy);
  ctx.lineTo(cx + tl.sx, cy + tl.sy);
  ctx.closePath();
  ctx.fillStyle = isGhost ? "rgba(0,212,255,0.15)" : shiftColor(color, 30);
  ctx.fill(); ctx.stroke();

  // Right face
  ctx.beginPath();
  const br = toIso(w, 0, 0);
  ctx.moveTo(cx + tr.sx, cy + tr.sy);
  ctx.lineTo(cx + br.sx, cy + br.sy);
  const brf = toIso(w, 0, d);
  ctx.lineTo(cx + brf.sx, cy + brf.sy);
  ctx.lineTo(cx + tf.sx, cy + tf.sy);
  ctx.closePath();
  ctx.fillStyle = isGhost ? "rgba(0,180,220,0.12)" : shiftColor(color, -20);
  ctx.fill(); ctx.stroke();

  // Left face
  ctx.beginPath();
  const bl = toIso(0, 0, d);
  ctx.moveTo(cx + tl.sx, cy + tl.sy);
  ctx.lineTo(cx + tf.sx, cy + tf.sy);
  ctx.lineTo(cx + brf.sx, cy + brf.sy);
  ctx.lineTo(cx + bl.sx, cy + bl.sy);
  ctx.closePath();
  ctx.fillStyle = isGhost ? "rgba(0,160,200,0.10)" : shiftColor(color, -50);
  ctx.fill(); ctx.stroke();

  ctx.globalAlpha = 1;
}

function shiftColor(hex, amount) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}

// ── Grid snap ────────────────────────────────────────────────────────────────
const GRID = 10; // px per unit
function snap(v) { return Math.round(v / GRID) * GRID; }

// ─────────────────────────────────────────────────────────────────────────────

const DRAW_MODES = ["container", "package"];

export default function DrawCanvas({ onContainerDrawn, onPackageDrawn, existingContainer }) {
  const canvasRef = useRef(null);
  const [mode, setMode] = useState("container"); // 'container' | 'package'
  const [phase, setPhase] = useState("idle"); // 'idle' | 'drawing-base' | 'drawing-height'
  const [baseStart, setBaseStart] = useState(null);
  const [baseEnd, setBaseEnd] = useState(null);
  const [heightVal, setHeightVal] = useState(0);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [drawnShapes, setDrawnShapes] = useState([]); // rendered history
  const [label, setLabel] = useState("Package 1");
  const [qty, setQty] = useState(1);

  // Map canvas coords to "world" units via inverse isometric
  // We draw on a flat top-view, user drags X→length, Y→width
  // Then they drag up to set height
  const getCanvasPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const CX = W / 2, CY = H * 0.62; // origin point for iso

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#0a0c14";
    ctx.fillRect(0, 0, W, H);

    // Draw grid dots
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let gx = 0; gx < W; gx += GRID) {
      for (let gy = 0; gy < H; gy += GRID) {
        ctx.fillRect(gx, gy, 1, 1);
      }
    }

    // Draw ground plane
    drawGroundPlane(ctx, CX, CY);

    // Draw axes labels
    ctx.save();
    ctx.fillStyle = "rgba(0,212,255,0.5)";
    ctx.font = "11px monospace";
    const ax = toIso(60, 0, 0);
    ctx.fillText("LENGTH →", CX + ax.sx, CY + ax.sy - 4);
    const az = toIso(0, 0, 60);
    ctx.fillText("WIDTH →", CX + az.sx + 6, CY + az.sy + 4);
    ctx.restore();

    // Draw saved shapes
    drawnShapes.forEach((s) => {
      drawIsoBox(ctx, CX, CY, s.w / GRID, s.h / GRID, s.d / GRID, s.color);
      // label
      const lp = toIso(s.w / GRID / 2, s.h / GRID + 2, s.d / GRID / 2);
      ctx.save();
      ctx.fillStyle = s.color;
      ctx.font = "bold 11px DM Sans, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(s.label, CX + lp.sx, CY + lp.sy - 6);
      ctx.restore();
    });

    // Draw ghost shape while dragging
    if (phase !== "idle" && baseStart) {
      const rawW = snap(Math.abs(mouse.x - baseStart.x));
      const rawD = snap(Math.abs(mouse.y - baseStart.y));
      const rawH = phase === "drawing-height" ? snap(Math.abs(heightVal)) : snap(Math.abs(mouse.y - baseStart.y));

      const ghostW = Math.max(GRID, phase === "drawing-base" ? rawW : snap(Math.abs(baseEnd.x - baseStart.x)));
      const ghostD = Math.max(GRID, phase === "drawing-base" ? rawD : snap(Math.abs(baseEnd.y - baseStart.y)));
      const ghostH = Math.max(GRID, phase === "drawing-height" ? snap(Math.max(1, baseStart.y - mouse.y)) : GRID);

      drawIsoBox(ctx, CX, CY, ghostW / GRID, ghostH / GRID, ghostD / GRID, "#00d4ff", 0.7, true);

      // Dimension labels
      ctx.save();
      ctx.fillStyle = "#00d4ff";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      if (phase === "drawing-base") {
        ctx.fillText(`${ghostW}×${ghostD} cm`, CX, CY - ghostH / GRID * 10 - 10);
      } else {
        ctx.fillText(`${ghostW}×${ghostH}×${ghostD} cm`, CX, CY - ghostH / GRID * 10 - 10);
      }
      ctx.restore();
    }

    // Crosshair at mouse
    ctx.save();
    ctx.strokeStyle = "rgba(0,212,255,0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mouse.x, 0); ctx.lineTo(mouse.x, H);
    ctx.moveTo(0, mouse.y); ctx.lineTo(W, mouse.y);
    ctx.stroke();
    ctx.restore();

    // Instructions overlay
    ctx.save();
    ctx.fillStyle = "rgba(0,212,255,0.6)";
    ctx.font = "12px DM Sans, monospace";
    ctx.textAlign = "left";
    const instruct = phase === "idle"
      ? `▶ Click & drag to draw ${mode} footprint`
      : phase === "drawing-base"
      ? "Release to set base (L × W)"
      : "▲ Drag UP to set height, click to confirm";
    ctx.fillText(instruct, 12, H - 14);
    ctx.restore();

  }, [phase, baseStart, baseEnd, mouse, heightVal, drawnShapes, mode]);

  // ── Ground plane ────────────────────────────────────────────────────────────
  function drawGroundPlane(ctx, cx, cy) {
    const size = 20;
    ctx.save();
    ctx.strokeStyle = "rgba(0,212,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = -size; i <= size; i++) {
      // Lines along X
      const s = toIso(i, 0, -size);
      const e = toIso(i, 0, size);
      ctx.beginPath();
      ctx.moveTo(cx + s.sx, cy + s.sy);
      ctx.lineTo(cx + e.sx, cy + e.sy);
      ctx.stroke();
      // Lines along Z
      const s2 = toIso(-size, 0, i);
      const e2 = toIso(size, 0, i);
      ctx.beginPath();
      ctx.moveTo(cx + s2.sx, cy + s2.sy);
      ctx.lineTo(cx + e2.sx, cy + e2.sy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Mouse handlers ──────────────────────────────────────────────────────────
  const handleMouseDown = (e) => {
    const pos = getCanvasPos(e);
    if (phase === "idle") {
      setBaseStart({ x: snap(pos.x), y: snap(pos.y) });
      setPhase("drawing-base");
    } else if (phase === "drawing-height") {
      // Confirm
      const w = Math.max(GRID, snap(Math.abs(baseEnd.x - baseStart.x)));
      const d = Math.max(GRID, snap(Math.abs(baseEnd.y - baseStart.y)));
      const h = Math.max(GRID, snap(Math.max(1, baseStart.y - pos.y)));
      commitShape(w, h, d);
    }
  };

  const handleMouseUp = (e) => {
    if (phase === "drawing-base") {
      const pos = getCanvasPos(e);
      setBaseEnd({ x: snap(pos.x), y: snap(pos.y) });
      setPhase("drawing-height");
      setHeightVal(0);
    }
  };

  const handleMouseMove = (e) => {
    const pos = getCanvasPos(e);
    setMouse({ x: pos.x, y: pos.y });
    if (phase === "drawing-height" && baseStart) {
      setHeightVal(baseStart.y - pos.y);
    }
  };

  const commitShape = (w, h, d) => {
    const colorPalette = ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#98D8C8","#F7DC6F"];
    const color = mode === "container" ? "#00d4ff" : colorPalette[drawnShapes.filter(s=>s.type==="package").length % colorPalette.length];
    const shape = { type: mode, w, h, d, color, label: mode === "container" ? "Container" : label };

    if (mode === "container") {
      setDrawnShapes([shape, ...drawnShapes.filter(s => s.type !== "container")]);
      onContainerDrawn({ length: w, width: d, height: h });
    } else {
      setDrawnShapes([...drawnShapes, shape]);
      onPackageDrawn({ length: w, width: d, height: h, label, quantity: qty });
    }

    setPhase("idle");
    setBaseStart(null);
    setBaseEnd(null);
  };

  const clearAll = () => {
    setDrawnShapes([]);
    setPhase("idle");
    setBaseStart(null);
    setBaseEnd(null);
  };

  const cancelDraw = () => {
    setPhase("idle");
    setBaseStart(null);
    setBaseEnd(null);
  };

  return (
    <div className="draw-canvas-wrapper">
      {/* Toolbar */}
      <div className="draw-toolbar">
        <div className="draw-mode-tabs">
          <button
            className={`draw-mode-btn ${mode === "container" ? "active-container" : ""}`}
            onClick={() => { setMode("container"); cancelDraw(); }}
          >
            📦 Container
          </button>
          <button
            className={`draw-mode-btn ${mode === "package" ? "active-package" : ""}`}
            onClick={() => { setMode("package"); cancelDraw(); }}
          >
            🗂️ Package
          </button>
        </div>

        {mode === "package" && (
          <div className="draw-pkg-meta">
            <input
              className="draw-pkg-name"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Package name"
            />
            <label className="draw-qty">
              Qty
              <input type="number" min="1" max="50" value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} />
            </label>
          </div>
        )}

        <div className="draw-actions">
          {phase !== "idle" && (
            <button className="draw-action-btn cancel" onClick={cancelDraw}>✕ Cancel</button>
          )}
          <button className="draw-action-btn" onClick={clearAll}>🗑 Clear</button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="draw-canvas"
        width={600}
        height={420}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setPhase(p => p === "drawing-base" ? "idle" : p)}
      />

      {/* Existing dims reminder */}
      {existingContainer && (
        <div className="draw-dims-badge">
          Container: {existingContainer.length} × {existingContainer.width} × {existingContainer.height} cm
        </div>
      )}
    </div>
  );
}
