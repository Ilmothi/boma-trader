import { useState } from 'react';
import { supabase } from '../supabase';
import type { Store } from '../lib/store';
import { fmt, today } from '../lib/calc';
import { Sheet } from '../components/Sheet';

const CATEGORIES = ['Medication', 'Herder pay', 'Herder upkeep', 'Feed', 'Transport', 'Other'];

export function Expenses({ store, userId, addSignal, onAddHandled }:
  { store: Store; userId: string; addSignal: boolean; onAddHandled: () => void }) {
  const [adding, setAdding] = useState(false);
  if (addSignal && !adding) { setAdding(true); onAddHandled(); }

  const list = store.expenses.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalAll = store.expenses.reduce((s, e) => s + e.amount, 0);
  const now = new Date();
  const monthTotal = store.expenses
    .filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((s, e) => s + e.amount, 0);

  async function del(id: string) {
    if (!confirm('Delete this expense?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    await store.refetch();
  }

  return (
    <div className="screen">
      <div className="stat-grid" style={{ marginBottom: 14 }}>
        <div className="stat-card"><div className="label">This month</div><div className="value">{fmt(monthTotal)}</div></div>
        <div className="stat-card"><div className="label">All time</div><div className="value">{fmt(totalAll)}</div></div>
      </div>

      {list.length === 0
        ? <div className="empty"><div className="glyph">◫</div><p>No expenses logged yet.</p></div>
        : list.map(e => {
          let scope = 'General';
          if (e.scope === 'batch') { const b = store.batches.find(x => x.id === e.batch_id); scope = 'Batch: ' + (b ? b.name : '(deleted)'); }
          return (
            <div className="exp-row" key={e.id}>
              <div>
                <div className="cat">{e.category}</div>
                <div className="note">{e.note || '—'}</div>
                <div className="sub">{e.date} · {scope}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="amt">{fmt(e.amount)}</div>
                <button className="del" onClick={() => del(e.id)}>✕</button>
              </div>
            </div>
          );
        })}

      {adding && <AddExpenseSheet store={store} userId={userId} onClose={() => setAdding(false)} />}
    </div>
  );
}

function AddExpenseSheet({ store, userId, onClose }: { store: Store; userId: string; onClose: () => void }) {
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [scope, setScope] = useState<'general' | 'batch'>('general');
  const [batchId, setBatchId] = useState(store.batches[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;
    setBusy(true);
    await supabase.from('expenses').insert({
      user_id: userId, date, amount: amt, category, scope,
      batch_id: scope === 'batch' ? batchId : null, note: note.trim() || null,
    });
    await store.refetch();
    setBusy(false);
    onClose();
  }

  return (
    <Sheet title="Log expense" onClose={onClose}>
      <div className="row2">
        <div><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label>Amount (KES)</label><input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></div>
      </div>
      <label>Category</label>
      <select value={category} onChange={e => setCategory(e.target.value)}>
        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
      </select>
      <label>Applies to</label>
      <select value={scope} onChange={e => setScope(e.target.value as 'general' | 'batch')}>
        <option value="general">General (whole herd)</option>
        <option value="batch">A specific batch</option>
      </select>
      {scope === 'batch' && (
        <>
          <label>Batch</label>
          <select value={batchId} onChange={e => setBatchId(e.target.value)}>
            {store.batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </>
      )}
      <label>Note</label>
      <input value={note} placeholder="e.g. Deworming, 3 herders' monthly wages" onChange={e => setNote(e.target.value)} />
      <button className="btn primary" disabled={busy} onClick={save}>Save expense</button>
    </Sheet>
  );
}
