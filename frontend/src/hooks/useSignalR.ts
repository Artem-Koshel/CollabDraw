import { useCallback, useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import type { JoinResult, PixelPatch } from '../types/PixelPatch';

export function useSignalR(userName: string) {
  const connRef = useRef<signalR.HubConnection | null>(null);
  const [joinResult, setJoinResult] = useState<JoinResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;

    const conn = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/draw')
      .withAutomaticReconnect()
      .build();

    connRef.current = conn;

    // Re-join after automatic reconnect so the hub re-adds the new connectionId to _connected
    conn.onreconnected(async () => {
      if (stopped) return;
      try {
        await conn.invoke('Join', userName);
      } catch (err) {
        console.error('Re-join after reconnect failed:', err);
      }
    });

    conn.start().then(async () => {
      if (stopped) return;
      const result = await conn.invoke<JoinResult>('Join', userName);
      if (stopped) { conn.stop(); return; }
      if (!result.success) {
        setError(result.reason ?? 'Cannot join canvas.');
        conn.stop();
        return;
      }
      setJoinResult(result);
    }).catch(err => {
      if (!stopped) setError(`Connection failed: ${err}`);
    });

    return () => {
      stopped = true;
      conn.stop();
    };
  }, [userName]);

  const sendPixelPatch = useCallback((patch: PixelPatch) => {
    connRef.current?.invoke('SendPixelPatch', patch).catch(err => {
      console.error('SendPixelPatch failed:', err);
    });
  }, []);

  return { joinResult, error, sendPixelPatch, connRef };
}
