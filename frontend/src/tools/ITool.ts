import type { Pixel } from '../types/PixelPatch';

export interface DrawPoint {
  x: number;
  y: number;
}

export interface ITool {
  readonly toolType: string;
  readonly label: string;
  onPointerDown(ctx: CanvasRenderingContext2D, point: DrawPoint): Pixel[];
  onPointerMove(ctx: CanvasRenderingContext2D, point: DrawPoint): Pixel[];
  onPointerUp(ctx: CanvasRenderingContext2D, point: DrawPoint): Pixel[];
}
