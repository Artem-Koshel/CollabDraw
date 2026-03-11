import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PenTool } from '../tools/PenTool';

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

describe('PenTool', () => {
  let tool: PenTool;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    tool = new PenTool();
    ctx = makeCtx();
  });

  it('has correct toolType and label', () => {
    expect(tool.toolType).toBe('pen');
    expect(tool.label).toBe('Pen');
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

  it('onPointerMove sets stroke style and line width', () => {
    tool.onPointerDown(ctx, { x: 0, y: 0 });
    tool.onPointerMove(ctx, { x: 1, y: 1 });
    expect(ctx.strokeStyle).toBe('#000000');
    expect(ctx.lineWidth).toBe(4);
  });

  it('onPointerDown returns pixels at start point', () => {
    const pixels = tool.onPointerDown(ctx, { x: 5, y: 5 });
    expect(pixels.length).toBeGreaterThan(0);
    expect(pixels.every(p => p.color === '#000000')).toBe(true);
  });

  it('onPointerUp returns pixels along stroke', () => {
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

  it('onPointerMove returns pixels along stroke', () => {
    tool.onPointerDown(ctx, { x: 0, y: 0 });
    const pixels = tool.onPointerMove(ctx, { x: 2, y: 0 });
    expect(pixels.length).toBeGreaterThan(0);
    expect(pixels.every(p => p.color === tool.color)).toBe(true);
  });

  it('second onPointerDown resets stroke origin', () => {
    tool.onPointerDown(ctx, { x: 0, y: 0 });
    tool.onPointerMove(ctx, { x: 100, y: 0 });
    // Start a new stroke far from the first
    tool.onPointerDown(ctx, { x: 50, y: 50 });
    const pixels = tool.onPointerUp(ctx, { x: 50, y: 50 });
    const radius = Math.ceil(tool.lineWidth / 2);
    // All pixels should be centered near (50,50), not near (0,0) or (100,0)
    expect(pixels.every(p => Math.abs(p.x - 50) <= radius && Math.abs(p.y - 50) <= radius)).toBe(true);
  });
});
