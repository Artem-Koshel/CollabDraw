export interface Pixel {
  x: number;
  y: number;
  color: string; // '#rrggbb' for pen/fill, '' (empty) for erase
}

export interface PixelPatch {
  pixels: Pixel[];
  authorName: string;
}

export interface JoinResult {
  success: boolean;
  reason?: string;
  canvasData?: string; // base64 PNG — current canvas state
  canvasWidth?: number;
  canvasHeight?: number;
  syncIntervalMs?: number;
}
