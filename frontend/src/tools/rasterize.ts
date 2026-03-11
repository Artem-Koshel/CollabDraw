import type { Pixel } from '../types/PixelPatch';
import type { DrawPoint } from './ITool';

function pixelsInCircle(cx: number, cy: number, radius: number, color: string): Pixel[] {
  const pixels: Pixel[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        pixels.push({ x: Math.round(cx + dx), y: Math.round(cy + dy), color });
      }
    }
  }
  return pixels;
}

/** Rasterize a stroke from `from` to `to` with a circular brush of the given radius.
 *  Returns a deduplicated map keyed by "x,y". */
export function rasterizeStroke(
  from: DrawPoint,
  to: DrawPoint,
  radius: number,
  color: string,
): Map<string, Pixel> {
  const result = new Map<string, Pixel>();
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = from.x + dx * t;
    const y = from.y + dy * t;
    for (const p of pixelsInCircle(x, y, radius, color)) {
      result.set(`${p.x},${p.y}`, p);
    }
  }
  return result;
}
