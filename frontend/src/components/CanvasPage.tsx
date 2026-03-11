import { useState } from 'react';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import type { ITool } from '../tools/ITool';
import { toolRegistry } from '../tools/toolRegistry';
import type { JoinResult, PixelPatch } from '../types/PixelPatch';
import * as signalR from '@microsoft/signalr';

interface Props {
  joinResult: JoinResult;
  authorName: string;
  connRef: React.RefObject<signalR.HubConnection | null>;
  sendPixelPatch: (patch: Omit<PixelPatch, 'sequenceNumber'>) => void;
}

export function CanvasPage({ joinResult, authorName, connRef, sendPixelPatch }: Props) {
  const [activeTool, setActiveTool] = useState<ITool>(toolRegistry[0]);

  return (
    <div style={styles.layout}>
      <Toolbar activeTool={activeTool} onSelectTool={setActiveTool} />
      <div style={styles.canvasWrapper}>
        <Canvas
          joinResult={joinResult}
          activeTool={activeTool}
          authorName={authorName}
          connRef={connRef}
          sendPixelPatch={sendPixelPatch}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#111',
  },
  canvasWrapper: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 16,
  },
};
