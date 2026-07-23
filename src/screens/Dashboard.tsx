import { useState } from 'react';
import { supabase } from '../supabase';
import { saveTarget, type Store } from '../lib/store';
import {
  fmt, today, daysBetween, aliveCount, herdTotals,
} from '../lib/calc';
import { Sheet } from '../components/Sheet';

export function Dashboard({ store, userId }: { store: Store; userId: string }) {
  const t = herdTotals(store);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(store.target));
  const [sellAll, setSellAll] = useState(false);

  const pct = Math.min(100, (t.alive / store.target) * 100);
  const remaining = store.target - t.alive;
  const max = Math.max(t.alive, t.sold, t.dead, 1);

  const nearing = store.batches
    .filter(b => aliveCount(store, b) > 0)
    .map(b => {
      const td = new Date(b.purchase_date);
      td.setMonth(td.getMonth() + b.target_months);
      return { name: b.name, alive: aliveCount(store, b), daysLeft: daysBetween(today(), td.toISOString().slice(0, 10)) };
    })
    .filter(x => x.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  async function commitTarget() {
    const n = parseInt(targetInput);
    if (isNaN(n) || n < 1) return;
    await saveTarget(userId, n);
    await store.refetch();
    setEditingTarget(false);
  }

  return (
    <div className="screen">
      <div className="target-card">
        <div className="target-head">
          <div>
            <div className="target-eyebrow">Road to Nairobi Market</div>
            <div className="target-count">{t.alive}<span className="target-goal">/ {store.target} goats</span></div>
          </div>
          <button className="target-edit" onClick={() => { setTargetInput(String(store.target)); setEditingTarget(true); }}>Edit</button>
        </div>
        <div className="target-track"><div className="target-fill" style={{ width: pct + '%' }} /></div>
        {t.alive >= store.target
          ? <div className="target-foot ready">Target reached — <b>{t.alive}</b> live goats. Time to organise the Nairobi trip.</div>
          : <div className="target-foot"><b>{remaining}</b> more goat{remaining > 1 ? 's' : ''} to go · {pct.toFixed(0)}% of the way there</div>}
        {t.alive > 0 && <button className="btn primary" onClick={() => setSellAll(true)}>Sell whole herd</button>}
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="label">Live herd</div><div className="value">{t.alive}</div></div>
        <div className="stat-card"><div className="label">Total bought</div><div className="value">{t.totalBought}</div></div>
        <div className="stat-card"><div className="label">Capital tied up</div><div className="value acc">{fmt(t.capital)}</div></div>
        <div className="stat-card"><div className="label">Mortality rate</div><div className="value neg">{t.mortality.toFixed(1)}%</div></div>
        <div className="stat-card wide"><div className="label">Realised profit</div><div className={'value ' + (t.profit >= 0 ? 'pos' : 'neg')}>{fmt(t.profit)}</div></div>
        <div className="stat-card"><div className="label">Sales revenue</div><div className="value">{fmt(t.revenue)}</div></div>
        <div className="stat-card"><div className="label">Total expenses</div><div className="value">{fmt(t.expenses)}</div></div>
      </div>

      <div className="section-title">Herd status (head count)</div>
      <div className="herd-gauge">
        <div className="gauge-row"><span className="gauge-label">Live</span><div className="gauge-track"><div className="gauge-fill" style={{ background: 'var(--sage)', width: (t.alive / max * 100) + '%' }} /></div><span className="gauge-count">{t.alive}</span></div>
        <div className="gauge-row"><span className="gauge-label">Sold</span><div className="gauge-track"><div className="gauge-fill" style={{ background: 'var(--ochre)', width: (t.sold / max * 100) + '%' }} /></div><span className="gauge-count">{t.sold}</span></div>
        <div className="gauge-row"><span className="gauge-label">Died</span><div className="gauge-track"><div className="gauge-fill" style={{ background: 'var(--rust)', width: (t.dead / max * 100) + '%' }} /></div><span className="gauge-count">{t.dead}</span></div>
      </div>

      <div className="section-title">Batches nearing target hold period</div>
      {nearing.length === 0
        ? <div className="empty" style={{ padding: 20 }}><p>No batches approaching their target sale window yet.</p></div>
        : nearing.map((x, i) => (
          <div className="batch-card" style={{ cursor: 'default' }} key={i}>
            <div className="row1"><span className="name">{x.name}</span><span className={'pill ' + (x.daysLeft <= 0 ? 'dead' : 'sold')}>{x.daysLeft <= 0 ? 'Overdue' : x.daysLeft + 'd left'}</span></div>
            <div className="sub">{x.alive} live goat{x.alive > 1 ? 's' : ''} ready to sell</div>
          </div>
        ))}

      <div className="section-title">Account</div>
      <div className="herd-gauge">
        <p style={{ fontSize: '0.82rem', color: 'var(--cream-dim)', margin: '0 0 10px' }}>
          Your records are saved to the cloud and sync to any device you sign in on.
        </p>
        <button className="btn ghost" style={{ marginTop: 0 }} onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>

      {editingTarget && (
        <Sheet title="Set target" sub="Live goats needed for the Nairobi Market trip." onClose={() => setEditingTarget(false)}>
          <label>Target number of goats</label>
          <input type="number" inputMode="numeric" value={targetInput} onChange={e => setTargetInput(e.target.value)} />
          <button className="btn primary" onClick={commitTarget}>Save target</button>
        </Sheet>
      )}

      {sellAll && <SellAllSheet store={store} userId={userId} onClose={() => setSellAll(false)} />}
    </div>
  );
}

function SellAllSheet({ store, userId, onClose }: { store: Store; userId: string; onClose: () => void }) {
  const alive = herdTotals(store).alive;
  const openBatches = store.batches.filter(b => aliveCount(store, b) > 0);
  const [date, setDate] = useState(today());
  const [buyer, setBuyer] = useState('');
  const [total, setTotal] = useState('');
  const [busy, setBusy] = useState(false);

  const totalNum = parseFloat(total) || 0;
  const perHead = alive ? totalNum / alive : 0;

  async function confirm() {
    if (totalNum <= 0 || alive < 1) return;
    setBusy(true);
    const b = buyer.trim() || 'Whole-herd sale';
    let allocated = 0;
    const rows = openBatches.map((batch, i) => {
      const n = aliveCount(store, batch);
      const amt = i === openBatches.length - 1 ? totalNum - allocated : Math.round(perHead * n);
      allocated += amt;
      return { user_id: userId, batch_id: batch.id, date, count: n, total: amt, buyer: b };
    });
    await supabase.from('sales').insert(rows);
    await store.refetch();
    setBusy(false);
    onClose();
  }

  return (
    <Sheet title="Sell whole herd"
      sub={`${alive} live goats across ${openBatches.length} open batch(es). Revenue is split evenly per goat.`}
      onClose={onClose}>
      <div className="row2">
        <div><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label>Buyer (optional)</label><input value={buyer} placeholder="e.g. Nairobi Market" onChange={e => setBuyer(e.target.value)} /></div>
      </div>
      <label>Total amount received (KES)</label>
      <input type="number" inputMode="decimal" value={total} placeholder="For the entire herd" onChange={e => setTotal(e.target.value)} />
      {totalNum > 0 && <div className="sheet-sub mono" style={{ marginTop: 8 }}>Works out to {fmt(perHead)} per goat</div>}
      <button className="btn primary" disabled={busy || totalNum <= 0} onClick={confirm}>Confirm herd sale</button>
      <button className="btn ghost" onClick={onClose}>Cancel</button>
    </Sheet>
  );
}
