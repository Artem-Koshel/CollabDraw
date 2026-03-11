import type { DrawPoint, ITool } from './ITool';
import type { Pixel } from '../types/PixelPatch';
import { rasterizeStroke } from './rasterize';

export class EraserTool implements ITool {
  readonly toolType = 'eraser';
  readonly label = 'Eraser';

  color = '#ffffff';
  lineWidth = 4;

  private prevPoint: DrawPoint | null = null;

  onPointerDown(ctx: CanvasRenderingContext2D, point: DrawPoint): Pixel[] {
    this.prevPoint = point;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    return [...rasterizeStroke(point, point, Math.ceil(this.lineWidth / 2), this.color).values()];
  }

  onPointerMove(ctx: CanvasRenderingContext2D, point: DrawPoint): Pixel[] {
    const from = this.prevPoint ?? point;
    this.prevPoint = point;
    ctx.lineTo(point.x, point.y);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    return [...rasterizeStroke(from, point, Math.ceil(this.lineWidth / 2), this.color).values()];
  }

  onPointerUp(_ctx: CanvasRenderingContext2D, point: DrawPoint): Pixel[] {
    const from = this.prevPoint ?? point;
    this.prevPoint = null;
    return [...rasterizeStroke(from, point, Math.ceil(this.lineWidth / 2), this.color).values()];
  }
}
