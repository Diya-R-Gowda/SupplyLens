import { useState } from 'react';
import api from '../api/axios';

export default function Login({ onSuccess }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post(isRegister ? '/auth/register' : '/auth/login', { email, password });
      onSuccess(response.data.data);
    } catch (requestError) {
      setError(requestError?.response?.data?.error?.message || (isRegister ? 'Unable to create account' : 'Unable to sign in'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.shell}>
      <p style={styles.kicker}>SupplyLens</p>
      <h1 style={styles.title}>{isRegister ? 'Create your supplier workspace' : 'Sign in to your supplier workspace'}</h1>
      <p style={styles.copy}>
        {isRegister
          ? 'Register a new workspace with an email and password.'
          : 'Sign in with your existing email and password.'}
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={styles.input}
            type="email"
            autoComplete="email"
          />
        </label>

        <label style={styles.label}>
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={styles.input}
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
        </label>

        {error ? <p style={styles.error}>{error}</p> : null}

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Continue'}
        </button>

        <button
          type="button"
          style={styles.toggle}
          onClick={() => {
            setMode(isRegister ? 'login' : 'register');
            setError('');
          }}
        >
          {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  shell: {
    display: 'grid',
    gap: '16px',
  },
  kicker: {
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    fontSize: '12px',
    fontWeight: 700,
    color: '#3853b5',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(2rem, 4vw, 3.4rem)',
    lineHeight: 1.02,
    color: '#0f172a',
  },
  copy: {
    margin: 0,
    maxWidth: '58ch',
    fontSize: '1rem',
    lineHeight: 1.7,
    color: '#475569',
  },
  form: {
    display: 'grid',
    gap: '14px',
    marginTop: '8px',
  },
  label: {
    display: 'grid',
    gap: '8px',
    fontSize: '0.92rem',
    fontWeight: 600,
    color: '#1e293b',
  },
  input: {
    border: '1px solid #cbd5e1',
    borderRadius: '14px',
    padding: '14px 16px',
    fontSize: '1rem',
    outline: 'none',
    background: 'rgba(255,255,255,0.92)',
  },
  error: {
    margin: 0,
    color: '#b91c1c',
    fontSize: '0.95rem',
  },
  button: {
    marginTop: '6px',
    border: 'none',
    borderRadius: '14px',
    padding: '14px 18px',
    fontSize: '1rem',
    fontWeight: 700,
    color: 'white',
    background: 'linear-gradient(135deg, #1d4ed8 0%, #0f766e 100%)',
    cursor: 'pointer',
  },
  toggle: {
    marginTop: '2px',
    border: 'none',
    background: 'none',
    color: '#3853b5',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    textAlign: 'center',
  },
};