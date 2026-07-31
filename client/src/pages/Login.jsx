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
    <div className="grid gap-4">
      <p className="m-0 uppercase tracking-[0.18em] text-xs font-bold text-[#3853b5]">SupplyLens</p>
      <h1 className="m-0 text-[clamp(2rem,4vw,3.4rem)] leading-[1.02] text-slate-900">
        {isRegister ? 'Create your supplier workspace' : 'Sign in to your supplier workspace'}
      </h1>
      <p className="m-0 max-w-[58ch] text-base leading-[1.7] text-slate-600">
        {isRegister
          ? 'Register a new workspace with an email and password.'
          : 'Sign in with your existing email and password.'}
      </p>

      <form onSubmit={handleSubmit} className="grid gap-3.5 mt-2">
        <label className="grid gap-2 text-[0.92rem] font-semibold text-slate-800">
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="border border-slate-300 rounded-2xl px-4 py-3.5 text-base outline-none bg-white/92"
            type="email"
            autoComplete="email"
          />
        </label>

        <label className="grid gap-2 text-[0.92rem] font-semibold text-slate-800">
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="border border-slate-300 rounded-2xl px-4 py-3.5 text-base outline-none bg-white/92"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
        </label>

        {error ? <p className="m-0 text-red-700 text-[0.95rem]">{error}</p> : null}

        <button
          type="submit"
          className="mt-1.5 border-none rounded-2xl px-[18px] py-3.5 text-base font-bold text-white bg-gradient-to-br from-blue-700 to-teal-700 cursor-pointer disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Continue'}
        </button>

        <button
          type="button"
          className="mt-0.5 border-none bg-transparent text-[#3853b5] font-semibold text-[0.9rem] cursor-pointer text-center"
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
