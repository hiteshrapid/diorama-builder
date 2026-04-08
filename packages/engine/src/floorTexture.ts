export type FloorStyle = "solid" | "grid-tiles" | "wood-planks" | "hex-tiles" | "carpet";

export const FLOOR_STYLES: FloorStyle[] = ["solid", "grid-tiles", "wood-planks", "hex-tiles", "carpet"];

export const FLOOR_STYLE_LABELS: Record<FloorStyle, string> = {
  "solid": "Solid",
  "grid-tiles": "Tiles",
  "wood-planks": "Wood",
  "hex-tiles": "Hex",
  "carpet": "Carpet",
};

/** Lighten (+) or darken (-) a hex color by a 0–255 amount */
export function adjustColor(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Perceived brightness 0–255 (ITU-R BT.601) */
export function getBrightness(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  return ((n >> 16) * 299 + ((n >> 8) & 0xff) * 587 + (n & 0xff) * 114) / 1000;
}

/**
 * Adjust color toward contrast: lighten dark colors, darken light ones.
 * Ensures pattern lines stay visible regardless of base color brightness.
 */
export function contrastAdjust(hex: string, amount: number): string {
  return adjustColor(hex, getBrightness(hex) < 128 ? amount : -amount);
}

/**
 * Draw a floor pattern onto a 512×512 canvas context.
 * The caller creates the canvas and wraps it in THREE.CanvasTexture.
 */
export function drawFloorPattern(
  ctx: CanvasRenderingContext2D,
  style: FloorStyle,
  color: string,
): void {
  const S = 512;
  ctx.clearRect(0, 0, S, S);

  switch (style) {
    case "solid": {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, S, S);
      break;
    }

    case "grid-tiles": {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, S, S);
      // Grout lines — contrasting shade, 2px wide, every 128px (= 4 tiles across canvas)
      ctx.strokeStyle = contrastAdjust(color, 50);
      ctx.lineWidth = 2;
      const step = 128;
      for (let i = 0; i <= S; i += step) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke();
      }
      // Highlight on top-left edge of each tile (always lighter)
      ctx.strokeStyle = adjustColor(color, 25);
      ctx.lineWidth = 1;
      for (let x = 0; x < S; x += step) {
        for (let y = 0; y < S; y += step) {
          ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + step - 2, y + 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 2, y + step - 2); ctx.stroke();
        }
      }
      break;
    }

    case "wood-planks": {
      const plankH = 64; // 8 planks across canvas
      const altColor = contrastAdjust(color, 22); // alternating plank shade
      const seamColor = contrastAdjust(color, 60); // high-contrast seam between planks
      for (let row = 0; row < S / plankH; row++) {
        const rowColor = row % 2 === 0 ? color : altColor;
        ctx.fillStyle = rowColor;
        ctx.fillRect(0, row * plankH, S, plankH);
        // Grain lines within each plank
        ctx.strokeStyle = contrastAdjust(rowColor, 14);
        ctx.lineWidth = 1;
        for (let g = 8; g < plankH - 4; g += 12) {
          ctx.beginPath();
          ctx.moveTo(0, row * plankH + g);
          ctx.lineTo(S, row * plankH + g);
          ctx.stroke();
        }
        // Plank edge seam
        ctx.strokeStyle = seamColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, row * plankH);
        ctx.lineTo(S, row * plankH);
        ctx.stroke();
      }
      break;
    }

    case "hex-tiles": {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, S, S);
      const r = 48; // hex radius
      const h = r * Math.sqrt(3);
      ctx.strokeStyle = contrastAdjust(color, 50);
      ctx.lineWidth = 2;
      for (let row = -1; row < S / h + 1; row++) {
        for (let col = -1; col < S / (r * 1.5) + 1; col++) {
          const cx = col * r * 3 + (row % 2 === 0 ? 0 : r * 1.5);
          const cy = row * h;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 180) * (60 * i - 30);
            const px = cx + r * Math.cos(angle);
            const py = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      break;
    }

    case "carpet": {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, S, S);
      // Directional hatch marks — contrasting diagonal lines
      ctx.strokeStyle = contrastAdjust(color, 28);
      ctx.lineWidth = 1;
      const spacing = 8;
      for (let i = -S; i < S * 2; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + S, S);
        ctx.stroke();
      }
      // Cross-hatch for depth
      ctx.strokeStyle = contrastAdjust(color, 14);
      for (let i = -S; i < S * 2; i += spacing * 3) {
        ctx.beginPath();
        ctx.moveTo(i, S);
        ctx.lineTo(i + S, 0);
        ctx.stroke();
      }
      break;
    }

    default: {
      // Unrecognized style — fall back to solid fill
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, S, S);
      break;
    }
  }
}
