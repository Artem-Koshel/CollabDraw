import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { CanvasPage } from './components/CanvasPage';
import { useSignalR } from './hooks/useSignalR';

export default function App() {
  const [userName, setUserName] = useState<string | null>(null);

  if (!userName) {
    return <LandingPage onJoin={setUserName} />;
  }

  return <ConnectedCanvas userName={userName} />;
}

function ConnectedCanvas({ userName }: { userName: string }) {
  const { joinResult, error, sendPixelPatch, connRef } = useSignalR(userName);

  if (error) {
    return (
      <div style={styles.center}>
        <div style={styles.errorCard}>
          <h2>Cannot join</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!joinResult) {
    return (
      <div style={styles.center}>
        <p style={{ color: '#ccc' }}>Connecting...</p>
      </div>
    );
  }

  return (
    <CanvasPage
      joinResult={joinResult}
      authorName={userName}
      connRef={connRef}
      sendPixelPatch={sendPixelPatch}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#111',
  },
  errorCard: {
    background: '#fff',
    borderRadius: 12,
    padding: '2rem',
    textAlign: 'center',
    maxWidth: 360,
  },
};
