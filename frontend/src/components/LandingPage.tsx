import { useState, type FormEvent } from 'react';

interface Props {
  onJoin: (name: string) => void;
}

export function LandingPage({ onJoin }: Props) {
  const [name, setName] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onJoin(trimmed);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>CollabDraw</h1>
        <p style={styles.subtitle}>Enter your name to join the canvas</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            maxLength={64}
          />
          <button style={styles.button} type="submit" disabled={!name.trim()}>
            Join
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#f0f0f0',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '2rem 3rem',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    textAlign: 'center',
  },
  title: { margin: '0 0 0.5rem', fontSize: '2rem' },
  subtitle: { margin: '0 0 1.5rem', color: '#666' },
  form: { display: 'flex', gap: 8 },
  input: {
    flex: 1,
    padding: '0.6rem 1rem',
    fontSize: '1rem',
    border: '1px solid #ccc',
    borderRadius: 6,
    outline: 'none',
  },
  button: {
    padding: '0.6rem 1.4rem',
    fontSize: '1rem',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
