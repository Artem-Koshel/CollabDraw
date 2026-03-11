import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import { useCanvas } from '../hooks/useCanvas';
import { PenTool } from '../tools/PenTool';

// jsdom doesn't implement canvas — patch prototype methods globally
const mockCtx = {
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeStyle: '#000',
  fillStyle: '#000',
  lineWidth: 0,
  lineCap: 'round' as CanvasLineCap,
  lineJoin: 'round' as CanvasLineJoin,
  globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
  canvas: { width: 200, height: 150 },
};

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    mockCtx as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/png;base64,AAAA',
  );
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
  // Reset mock call counts each test
  Object.values(mockCtx).forEach(v => {
    if (v && typeof (v as ReturnType<typeof vi.fn>).mockClear === 'function') {
      (v as ReturnType<typeof vi.fn>).mockClear();
    }
  });
});

afterEach(() => vi.restoreAllMocks());

function makePointerEvent(x: number, y: number, pointerId = 1): React.PointerEvent<HTMLCanvasElement> {
  return {
    clientX: x,
    clientY: y,
    pointerId,
    preventDefault: vi.fn(),
  } as unknown as React.PointerEvent<HTMLCanvasElement>;
}

function buildHook(tool = new PenTool(), sendPixelPatch = vi.fn(), syncIntervalMs = 500) {
  return renderHook(() => {
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = vi.fn().mockReturnValue({ left: 0, top: 0 });
    const canvasRef = useRef(canvas);
    const connRef = useRef(null);
    return useCanvas({ canvasRef, activeTool: tool, authorName: 'Test', syncIntervalMs, connRef, sendPixelPatch });
  });
}

describe('useCanvas', () => {
  it('returns three pointer event handlers', () => {
    const { result } = buildHook();
    expect(typeof result.current.onPointerDown).toBe('function');
    expect(typeof result.current.onPointerMove).toBe('function');
    expect(typeof result.current.onPointerUp).toBe('function');
  });

  it('onPointerDown calls activeTool.onPointerDown with canvas coordinates', () => {
    const tool = new PenTool();
    const spy = vi.spyOn(tool, 'onPointerDown');
    const { result } = buildHook(tool);
    act(() => result.current.onPointerDown(makePointerEvent(10, 20)));
    expect(spy).toHaveBeenCalledWith(expect.anything(), { x: 10, y: 20 });
  });

  it('onPointerMove does nothing when not drawing', () => {
    const tool = new PenTool();
    const spy = vi.spyOn(tool, 'onPointerMove');
    const { result } = buildHook(tool);
    act(() => result.current.onPointerMove(makePointerEvent(10, 20)));
    expect(spy).not.toHaveBeenCalled();
  });

  it('onPointerMove calls activeTool.onPointerMove after pointer down', () => {
    const tool = new PenTool();
    const spy = vi.spyOn(tool, 'onPointerMove');
    const { result } = buildHook(tool);
    act(() => result.current.onPointerDown(makePointerEvent(0, 0)));
    act(() => result.current.onPointerMove(makePointerEvent(5, 5)));
    expect(spy).toHaveBeenCalledWith(expect.anything(), { x: 5, y: 5 });
  });

  it('onPointerUp calls activeTool.onPointerUp', () => {
    const tool = new PenTool();
    const spy = vi.spyOn(tool, 'onPointerUp');
    const { result } = buildHook(tool);
    act(() => result.current.onPointerDown(makePointerEvent(0, 0)));
    act(() => result.current.onPointerMove(makePointerEvent(1, 0)));
    act(() => result.current.onPointerUp(makePointerEvent(2, 0)));
    expect(spy).toHaveBeenCalledWith(expect.anything(), { x: 2, y: 0 });
  });

  it('onPointerUp does nothing when not drawing', () => {
    const tool = new PenTool();
    const spy = vi.spyOn(tool, 'onPointerUp');
    const { result } = buildHook(tool);
    act(() => result.current.onPointerUp(makePointerEvent(10, 10)));
    expect(spy).not.toHaveBeenCalled();
  });

  it('sends patch mid-stroke without pointer up', () => {
    vi.useFakeTimers();
    const sendPixelPatch = vi.fn();
    const { result } = buildHook(new PenTool(), sendPixelPatch, 100);
    act(() => result.current.onPointerDown(makePointerEvent(5, 5)));
    act(() => result.current.onPointerMove(makePointerEvent(6, 5)));
    // No onPointerUp — timer should still flush the pending pixels
    act(() => vi.advanceTimersByTime(100));
    expect(sendPixelPatch).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('accumulated pixels are sent via sendPixelPatch after syncIntervalMs', () => {
    vi.useFakeTimers();
    const sendPixelPatch = vi.fn();
    const { result } = buildHook(new PenTool(), sendPixelPatch, 100);
    act(() => result.current.onPointerDown(makePointerEvent(5, 5)));
    act(() => result.current.onPointerMove(makePointerEvent(6, 5)));
    act(() => result.current.onPointerUp(makePointerEvent(7, 5)));
    act(() => vi.advanceTimersByTime(100));
    expect(sendPixelPatch).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('pen patch pixels carry the pen color', () => {
    vi.useFakeTimers();
    const sendPixelPatch = vi.fn();
    const { result } = buildHook(new PenTool(), sendPixelPatch, 100);
    act(() => result.current.onPointerDown(makePointerEvent(5, 5)));
    act(() => result.current.onPointerMove(makePointerEvent(6, 5)));
    act(() => result.current.onPointerUp(makePointerEvent(7, 5)));
    act(() => vi.advanceTimersByTime(100));
    expect(sendPixelPatch).toHaveBeenCalledOnce();
    const patch = sendPixelPatch.mock.calls[0][0];
    expect(patch.pixels.length).toBeGreaterThan(0);
    expect(patch.pixels[0].color).toBe('#000000');
    vi.useRealTimers();
  });

  it('flush-at-250 triggers immediate send when pixel threshold is reached', () => {
    const sendPixelPatch = vi.fn();
    const { result } = buildHook(new PenTool(), sendPixelPatch, 10000); // long timer — no timer flush
    act(() => result.current.onPointerDown(makePointerEvent(0, 0)));
    // Long stroke generates well over 250 unique pixels
    act(() => result.current.onPointerMove(makePointerEvent(200, 0)));
    expect(sendPixelPatch).toHaveBeenCalled();
  });
});
