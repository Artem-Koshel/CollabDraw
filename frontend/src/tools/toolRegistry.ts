import type { ITool } from './ITool';
import { PenTool } from './PenTool';
import { EraserTool } from './EraserTool';

// To add a new tool: import it here and add an entry to the array. Nothing else changes.
export const toolRegistry: ITool[] = [
  new PenTool(),
  new EraserTool(),
];
