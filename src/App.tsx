import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useStore } from './lib/store';
import { Auth } from './components/Auth';
import { Dashboard } from './screens/Dashboard';
import { Batches } from './screens/Batches';
import { Expenses } from './screens/Expenses';
import { Reports } from './screens/Reports';

type Tab = 'dashboard' | 'batches' | 'expenses' | 'reports';

const TABS: { id: Tab; ic: string; label: string }[] = [
  { id: 'dashboard', ic: '◆', label: 'Dashboard' },
  { id: 'batches', ic: '⛃', label: 'Batches' },
  { id: 'expenses', ic: '◫', label: 'Expenses' },
  { id: 'reports', ic: '▤', label: 'Reports' },
];

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="loader">Loading…</div>;
  if (!session) return <Auth />;
  return <Shell userId={session.user.id} />;
}

function Shell({ userId }: { userId: string }) {
  const store = useStore(userId);
  const [tab, setTab] = useState<Tab>('dashboard');
  // FAB → screen add-signal
  const [addSignal, setAddSignal] = useState(false);

  if (store.loading) return <div className="loader">Loading your herd…</div>;

  const showFab = tab === 'batches' || tab === 'expenses';

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><span className="mark">◆</span><h1>Boma Trader</h1></div>
        <div className="tag">Goat trading ledger · buy by batch · hold · resell</div>
      </header>

      <main>
        {tab === 'dashboard' && <Dashboard store={store} userId={userId} />}
        {tab === 'batches' && <Batches store={store} userId={userId} addSignal={addSignal} onAddHandled={() => setAddSignal(false)} />}
        {tab === 'expenses' && <Expenses store={store} userId={userId} addSignal={addSignal} onAddHandled={() => setAddSignal(false)} />}
        {tab === 'reports' && <Reports store={store} />}
      </main>

      {showFab && <button className="fab" onClick={() => setAddSignal(true)}>+</button>}

      <nav className="tabbar">
        {TABS.map(t => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => { setTab(t.id); setAddSignal(false); }}>
            <span className="ic">{t.ic}</span>{t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
