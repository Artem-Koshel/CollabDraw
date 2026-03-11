import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import type { ITool } from '../tools/ITool';
import { useCanvas } from '../hooks/useCanvas';
import type { JoinResult, PixelPatch } from '../types/PixelPatch';

interface Props {
  joinResult: JoinResult;
  activeTool: ITool;
  authorName: string;
  connRef: React.RefObject<signalR.HubConnection | null>;
  sendPixelPatch: (patch: Omit<PixelPatch, 'sequenceNumber'>) => void;
}

export function Canvas({ joinResult, activeTool, authorName, connRef, sendPixelPatch }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const width = joinResult.canvasWidth!;
  const height = joinResult.canvasHeight!;
  const syncIntervalMs = joinResult.syncIntervalMs!;

  // Paint the initial canvas state received from the server
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !joinResult.canvasData) return;

    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = `data:image/png;base64,${joinResult.canvasData}`;
  }, [joinResult.canvasData]);

  const { onPointerDown, onPointerMove, onPointerUp } = useCanvas({
    canvasRef,
    activeTool,
    authorName,
    syncIntervalMs,
    connRef,
    sendPixelPatch,
  });

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block', cursor: 'crosshair', background: '#fff' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
}
