import type { ITool } from '../tools/ITool';
import { toolRegistry } from '../tools/toolRegistry';

interface Props {
  activeTool: ITool;
  onSelectTool: (tool: ITool) => void;
}

export function Toolbar({ activeTool, onSelectTool }: Props) {
  return (
    <div style={styles.toolbar}>
      {toolRegistry.map(tool => (
        <button
          key={tool.toolType}
          style={{
            ...styles.button,
            ...(activeTool.toolType === tool.toolType ? styles.active : {}),
          }}
          onClick={() => onSelectTool(tool)}
          title={tool.label}
        >
          {tool.label}
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    gap: 8,
    padding: '8px 12px',
    background: '#1e1e1e',
    alignItems: 'center',
  },
  button: {
    padding: '6px 16px',
    border: '1px solid #444',
    borderRadius: 4,
    background: '#2d2d2d',
    color: '#eee',
    cursor: 'pointer',
    fontSize: 14,
  },
  active: {
    background: '#3b82f6',
    borderColor: '#3b82f6',
    color: '#fff',
  },
};
