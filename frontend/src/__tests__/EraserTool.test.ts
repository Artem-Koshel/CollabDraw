import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EraserTool } from '../tools/EraserTool';

function makeCtx(): CanvasRenderingContext2D {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    strokeStyle: '',
    lineWidth: 0,
    lineCap: 'butt',
    lineJoin: 'miter',
  } as unknown as CanvasRenderingContext2D;
}

describe('EraserTool', () => {
  let tool: EraserTool;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    tool = new EraserTool();
    ctx = makeCtx();
  });

  it('has correct toolType and label', () => {
    expect(tool.toolType).toBe('eraser');
    expect(tool.label).toBe('Eraser');
  });

  it('onPointerDown calls beginPath and moveTo', () => {
    tool.onPointerDown(ctx, { x: 10, y: 20 });
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 20);
  });

  it('onPointerMove calls lineTo and stroke', () => {
    tool.onPointerDown(ctx, { x: 0, y: 0 });
    tool.onPointerMove(ctx, { x: 5, y: 5 });
    expect(ctx.lineTo).toHaveBeenCalledWith(5, 5);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('onPointerMove sets stroke style to white and line width', () => {
    tool.onPointerDown(ctx, { x: 0, y: 0 });
    tool.onPointerMove(ctx, { x: 1, y: 1 });
    expect(ctx.strokeStyle).toBe('#ffffff');
    expect(ctx.lineWidth).toBe(4);
  });

  it('onPointerDown returns white pixels at start point', () => {
    const pixels = tool.onPointerDown(ctx, { x: 5, y: 5 });
    expect(pixels.length).toBeGreaterThan(0);
    expect(pixels.every(p => p.color === '#ffffff')).toBe(true);
  });

  it('onPointerUp returns white pixels along stroke', () => {
    tool.onPointerDown(ctx, { x: 10, y: 10 });
    const pixels = tool.onPointerUp(ctx, { x: 12, y: 10 });
    expect(pixels.length).toBeGreaterThan(0);
    expect(pixels.every(p => p.color === tool.color)).toBe(true);
  });

  it('pixels extend outward by radius (lineWidth/2) from stroke', () => {
    const pixels = tool.onPointerDown(ctx, { x: 10, y: 10 });
    const radius = Math.ceil(tool.lineWidth / 2); // 2
    const xs = pixels.map(p => p.x);
    const ys = pixels.map(p => p.y);
    expect(Math.min(...xs)).toBe(10 - radius);
    expect(Math.max(...xs)).toBe(10 + radius);
    expect(Math.min(...ys)).toBe(10 - radius);
    expect(Math.max(...ys)).toBe(10 + radius);
  });

  it('onPointerMove returns white pixels along stroke', () => {
    tool.onPointerDown(ctx, { x: 0, y: 0 });
    const pixels = tool.onPointerMove(ctx, { x: 2, y: 0 });
    expect(pixels.length).toBeGreaterThan(0);
    expect(pixels.every(p => p.color === tool.color)).toBe(true);
  });

  it('second onPointerDown resets stroke origin', () => {
    tool.onPointerDown(ctx, { x: 0, y: 0 });
    tool.onPointerMove(ctx, { x: 100, y: 0 });
    tool.onPointerDown(ctx, { x: 50, y: 50 });
    const pixels = tool.onPointerUp(ctx, { x: 50, y: 50 });
    const radius = Math.ceil(tool.lineWidth / 2);
    expect(pixels.every(p => Math.abs(p.x - 50) <= radius && Math.abs(p.y - 50) <= radius)).toBe(true);
  });
});
