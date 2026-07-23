import { useState } from 'react';
import { supabase } from '../supabase';

export function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit() {
    setErr(''); setMsg(''); setBusy(true);
    const fn = mode === 'in'
      ? supabase.auth.signInWithPassword({ email, password: pw })
      : supabase.auth.signUp({ email, password: pw });
    const { error } = await fn;
    setBusy(false);
    if (error) { setErr(error.message); return; }
    if (mode === 'up') setMsg('Account created. If email confirmation is on, check your inbox, then sign in.');
  }

  return (
    <div className="auth-wrap">
      <div className="brand"><span className="mark">◆</span><h1>Boma Trader</h1></div>
      <div className="tag">Goat trading ledger</div>
      <label>Email</label>
      <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
      <label>Password</label>
      <input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
        value={pw} onChange={e => setPw(e.target.value)} />
      <button className="btn primary" disabled={busy || !email || !pw} onClick={submit}>
        {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
      </button>
      {err && <div className="auth-err">{err}</div>}
      {msg && <div className="target-foot" style={{ textAlign: 'center', marginTop: 12 }}>{msg}</div>}
      <div className="auth-toggle">
        {mode === 'in' ? 'No account yet? ' : 'Already have an account? '}
        <button onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(''); setMsg(''); }}>
          {mode === 'in' ? 'Create one' : 'Sign in'}
        </button>
      </div>
    </div>
  );
}
