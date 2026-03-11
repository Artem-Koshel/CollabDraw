import { useCallback, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import type { ITool } from '../tools/ITool';
import type { Pixel, PixelPatch } from '../types/PixelPatch';

const MAX_BATCH_SIZE = 250;

interface UseCanvasOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  activeTool: ITool;
  authorName: string;
  syncIntervalMs: number;
  connRef: React.RefObject<signalR.HubConnection | null>;
  sendPixelPatch: (patch: PixelPatch) => void;
}

export function useCanvas({
  canvasRef,
  activeTool,
  authorName,
  syncIntervalMs,
  connRef,
  sendPixelPatch,
}: UseCanvasOptions) {
  const isDrawingRef = useRef(false);
  const pendingPixels = useRef<Map<string, Pixel>>(new Map());

  const flush = useCallback(() => {
    const map = pendingPixels.current;
    if (map.size === 0) return;
    const pixels = [...map.values()];
    map.clear();
    sendPixelPatch({ pixels, authorName });
  }, [authorName, sendPixelPatch]);

  const mergePixels = useCallback((incoming: Pixel[]) => {
    const map = pendingPixels.current;
    for (const p of incoming) {
      map.set(`${p.x},${p.y}`, p);
    }
    if (map.size >= MAX_BATCH_SIZE) flush();
  }, [flush]);

  // Timer: flush accumulated pixels every syncIntervalMs
  useEffect(() => {
    const timer = setInterval(flush, syncIntervalMs);
    return () => clearInterval(timer);
  }, [syncIntervalMs, flush]);

  // Listen for incoming patches from other users
  useEffect(() => {
    const conn = connRef.current;
    if (!conn) return;

    const handler = (patch: PixelPatch) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;
      applyPatch(ctx, patch);
    };

    conn.on('ReceivePixelPatch', handler);
    return () => conn.off('ReceivePixelPatch', handler);
  }, [connRef.current, canvasRef]);

  const getPoint = useCallback((e: React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    };
  }, [canvasRef]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    isDrawingRef.current = true;
    canvas!.setPointerCapture(e.pointerId);
    mergePixels(activeTool.onPointerDown(ctx, getPoint(e)));
  }, [activeTool, getPoint, canvasRef, mergePixels]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    mergePixels(activeTool.onPointerMove(ctx, getPoint(e)));
  }, [activeTool, getPoint, canvasRef, mergePixels]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    mergePixels(activeTool.onPointerUp(ctx, getPoint(e)));
  }, [activeTool, getPoint, canvasRef, mergePixels]);

  return { onPointerDown, onPointerMove, onPointerUp };
}

function applyPatch(ctx: CanvasRenderingContext2D, patch: PixelPatch): void {
  for (const { x, y, color } of patch.pixels) {
    if (color === '') {
      ctx.clearRect(x, y, 1, 1);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
