import { describe, it, expect } from 'vitest';
import { toolRegistry } from '../tools/toolRegistry';
import { PenTool } from '../tools/PenTool';
import { EraserTool } from '../tools/EraserTool';

describe('toolRegistry', () => {
  it('contains exactly two tools', () => {
    expect(toolRegistry).toHaveLength(2);
  });

  it('first tool is a PenTool', () => {
    expect(toolRegistry[0]).toBeInstanceOf(PenTool);
  });

  it('second tool is an EraserTool', () => {
    expect(toolRegistry[1]).toBeInstanceOf(EraserTool);
  });

  it('all tools have required ITool properties', () => {
    for (const tool of toolRegistry) {
      expect(typeof tool.toolType).toBe('string');
      expect(typeof tool.label).toBe('string');
      expect(typeof tool.onPointerDown).toBe('function');
      expect(typeof tool.onPointerMove).toBe('function');
      expect(typeof tool.onPointerUp).toBe('function');
    }
  });

  it('tool types are unique', () => {
    const types = toolRegistry.map(t => t.toolType);
    expect(new Set(types).size).toBe(types.length);
  });
});
