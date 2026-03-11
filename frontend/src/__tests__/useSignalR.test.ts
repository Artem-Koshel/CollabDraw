import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Reference kept outside the factory so beforeEach can swap the mock per test
let mockConnection: {
  start: ReturnType<typeof vi.fn>;
  invoke: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  onreconnected: ReturnType<typeof vi.fn>;
};

vi.mock('@microsoft/signalr', () => {
  // Use a class so `new HubConnectionBuilder()` works correctly
  class HubConnectionBuilder {
    withUrl() { return this; }
    withAutomaticReconnect() { return this; }
    build() { return mockConnection; }
  }
  return { HubConnectionBuilder };
});

import { useSignalR } from '../hooks/useSignalR';
import type { JoinResult } from '../types/PixelPatch';

const successResult: JoinResult = {
  success: true,
  canvasData: btoa('fake-png'),
  canvasWidth: 1200,
  canvasHeight: 800,
  syncIntervalMs: 100,
};

describe('useSignalR', () => {
  beforeEach(() => {
    mockConnection = {
      start: vi.fn().mockResolvedValue(undefined),
      invoke: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
      onreconnected: vi.fn(),
    };
  });

  it('returns null joinResult and no error initially', () => {
    mockConnection.start.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSignalR('Alice'));
    expect(result.current.joinResult).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets joinResult on successful join', async () => {
    mockConnection.invoke.mockResolvedValue(successResult);

    const { result } = renderHook(() => useSignalR('Alice'));

    await waitFor(() => expect(result.current.joinResult).not.toBeNull());
    expect(result.current.joinResult!.success).toBe(true);
    expect(result.current.joinResult!.canvasWidth).toBe(1200);
    expect(result.current.error).toBeNull();
  });

  it('sets error when join returns success=false', async () => {
    mockConnection.invoke.mockResolvedValue({ success: false, reason: 'Canvas is full.' } as JoinResult);

    const { result } = renderHook(() => useSignalR('Bob'));

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).toContain('Canvas is full.');
    expect(result.current.joinResult).toBeNull();
  });

  it('sets error when connection fails', async () => {
    mockConnection.start.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSignalR('Charlie'));

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).toContain('Connection failed');
  });

  it('exposes a sendPixelPatch function', () => {
    mockConnection.start.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSignalR('Alice'));
    expect(typeof result.current.sendPixelPatch).toBe('function');
  });

  it('sendPixelPatch invokes SendPixelPatch on the connection', async () => {
    mockConnection.invoke.mockResolvedValue(successResult);

    const { result } = renderHook(() => useSignalR('Alice'));
    await waitFor(() => expect(result.current.joinResult).not.toBeNull());

    const patch = { x: 0, y: 0, width: 10, height: 10, imageData: 'abc', authorName: 'Alice' };
    result.current.sendPixelPatch(patch);

    expect(mockConnection.invoke).toHaveBeenCalledWith('SendPixelPatch', patch);
  });

  it('stops the connection on unmount', () => {
    mockConnection.start.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderHook(() => useSignalR('Alice'));
    unmount();
    expect(mockConnection.stop).toHaveBeenCalled();
  });
});
