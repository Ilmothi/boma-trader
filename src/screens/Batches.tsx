import { useState } from 'react';
import { supabase } from '../supabase';
import type { Store } from '../lib/store';
import type { Batch } from '../types';
import {
  fmt, today, daysBetween, aliveCount, soldCount, deadCount,
  salesRevenue, salesFor, deathsFor, isClosed, batchRealised,
} from '../lib/calc';
import { Sheet } from '../components/Sheet';

type Filter = 'all' | 'open' | 'closed';

export function Batches({ store, userId, addSignal, onAddHandled }:
  { store: Store; userId: string; addSignal: boolean; onAddHandled: () => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [detailId, setDetailId] = useState<string | null>(null);

  // FAB from App sets addSignal; open the add sheet in response.
  const [adding, setAdding] = useState(false);
  if (addSignal && !adding) { setAdding(true); onAddHandled(); }

  let list = store.batches.slice();
  if (filter === 'open') list = list.filter(b => !isClosed(store, b));
  if (filter === 'closed') list = list.filter(b => isClosed(store, b));

  return (
    <div className="screen">
      <div className="chips">
        {(['all', 'open', 'closed'] as Filter[]).map(f => (
          <div key={f} className={'chip' + (filter === f ? ' on' : '')} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </div>
        ))}
      </div>

      {list.length === 0
        ? <div className="empty"><div className="glyph">⛃</div><p>No batches yet.</p><p>Tap + to record a purchase.</p></div>
        : list.map(b => {
          const alive = aliveCount(store, b), sold = soldCount(store, b), dead = deadCount(store, b);
          const held = daysBetween(b.purchase_date, today());
          const pct = Math.min(100, held / (b.target_months * 30) * 100);
          const closed = isClosed(store, b);
          return (
            <div className="batch-card" key={b.id} onClick={() => setDetailId(b.id)}>
              <div className="row1">
                <div><div className="name">{b.name}</div>
                  <div className="sub">{b.head_count} bought @ {fmt(b.cost_per_head)} · {b.market || '—'}</div></div>
              </div>
              <div className="pill-row">
                <span className="pill alive">{alive} live</span>
                {sold > 0 && <span className="pill sold">{sold} sold</span>}
                {dead > 0 && <span className="pill dead">{dead} died</span>}
                <span className="pill cost">{fmt(b.head_count * b.cost_per_head)}</span>
              </div>
              {closed
                ? <div className="done-flag">✓ Batch closed — all goats accounted for</div>
                : <div className="progress-mini"><i style={{ width: pct + '%' }} /></div>}
            </div>
          );
        })}

      {adding && <AddBatchSheet userId={userId} store={store} onClose={() => setAdding(false)} />}
      {detailId && <DetailSheet id={detailId} store={store} userId={userId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function AddBatchSheet({ userId, store, onClose }: { userId: string; store: Store; onClose: () => void }) {
  const [date, setDate] = useState(today());
  const [market, setMarket] = useState('');
  const [name, setName] = useState('');
  const [count, setCount] = useState('');
  const [cost, setCost] = useState('');
  const [target, setTarget] = useState('12');
  const [busy, setBusy] = useState(false);

  const c = parseInt(count) || 0, p = parseFloat(cost) || 0;

  async function save() {
    if (c < 1) return;
    setBusy(true);
    const label = name.trim() || `${market.trim() || 'Market'} · ${date.slice(5)}`;
    await supabase.from('batches').insert({
      user_id: userId, name: label, market: market.trim() || null,
      purchase_date: date, head_count: c, cost_per_head: p, target_months: parseInt(target),
    });
    await store.refetch();
    setBusy(false);
    onClose();
  }

  return (
    <Sheet title="New purchase (batch)" sub="Record a lot of goats bought together from a market." onClose={onClose}>
      <div className="row2">
        <div><label>Purchase date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label>Market</label><input value={market} placeholder="e.g. Wajir" onChange={e => setMarket(e.target.value)} /></div>
      </div>
      <label>Batch label (optional)</label>
      <input value={name} placeholder="Auto: market + date if left blank" onChange={e => setName(e.target.value)} />
      <div className="row2">
        <div><label>Number of goats</label><input type="number" inputMode="numeric" value={count} placeholder="e.g. 40" onChange={e => setCount(e.target.value)} /></div>
        <div><label>Cost per goat (KES)</label><input type="number" inputMode="decimal" value={cost} placeholder="e.g. 3500" onChange={e => setCost(e.target.value)} /></div>
      </div>
      <div className="sheet-sub mono" style={{ marginTop: 8 }}>Total cost: {fmt(c * p)}</div>
      <label>Target hold period</label>
      <select value={target} onChange={e => setTarget(e.target.value)}>
        <option value="6">6 months</option>
        <option value="9">9 months</option>
        <option value="12">12 months</option>
        <option value="18">18 months</option>
      </select>
      <button className="btn primary" disabled={busy || c < 1} onClick={save}>Save batch</button>
    </Sheet>
  );
}

function DetailSheet({ id, store, userId, onClose }:
  { id: string; store: Store; userId: string; onClose: () => void }) {
  const b = store.batches.find(x => x.id === id);
  const [mode, setMode] = useState<'view' | 'sell' | 'death'>('view');
  if (!b) return null;

  const alive = aliveCount(store, b);
  const directExp = store.expenses.filter(e => e.scope === 'batch' && e.batch_id === b.id).reduce((s, e) => s + e.amount, 0);
  const realised = batchRealised(store, b);
  const held = daysBetween(b.purchase_date, today());

  type Ev = { t: 'sale' | 'death'; date: string; text: string; id: string };
  const events: Ev[] = [
    ...salesFor(store, b.id).map(s => ({ t: 'sale' as const, date: s.date, id: s.id, text: `Sold ${s.count} · ${fmt(s.total)}${s.buyer ? ' · ' + s.buyer : ''}` })),
    ...deathsFor(store, b.id).map(d => ({ t: 'death' as const, date: d.date, id: d.id, text: `Died ${d.count} · ${d.cause || 'unknown'}` })),
  ].sort((a, c) => new Date(c.date).getTime() - new Date(a.date).getTime());

  async function delEvent(t: 'sale' | 'death', eid: string) {
    if (!confirm('Remove this record?')) return;
    await supabase.from(t === 'sale' ? 'sales' : 'deaths').delete().eq('id', eid);
    await store.refetch();
  }
  async function delBatch() {
    if (!confirm('Delete this whole batch and its history?')) return;
    await supabase.from('batches').delete().eq('id', b!.id);
    await store.refetch();
    onClose();
  }

  if (mode === 'sell') return <SaleSheet batch={b} alive={alive} store={store} userId={userId} onClose={() => setMode('view')} onDone={onClose} />;
  if (mode === 'death') return <DeathSheet batch={b} alive={alive} store={store} userId={userId} onClose={() => setMode('view')} onDone={onClose} />;

  return (
    <Sheet title={b.name}
      sub={`Bought ${b.purchase_date} · ${b.market || '—'} · ${b.head_count} @ ${fmt(b.cost_per_head)}`}
      onClose={onClose}>
      <div className="detail-stat"><span>Live now</span><b>{alive}</b></div>
      <div className="detail-stat"><span>Sold</span><b>{soldCount(store, b)}</b></div>
      <div className="detail-stat"><span>Died</span><b>{deadCount(store, b)}</b></div>
      <div className="detail-stat"><span>Total purchase cost</span><b>{fmt(b.head_count * b.cost_per_head)}</b></div>
      <div className="detail-stat"><span>Sales revenue</span><b>{fmt(salesRevenue(store, b))}</b></div>
      <div className="detail-stat"><span>Batch expenses (direct)</span><b>{fmt(directExp)}</b></div>
      <div className="detail-stat"><span>Days held</span><b>{held}</b></div>
      <div className="detail-stat"><span>Realised P&amp;L so far</span><b style={{ color: realised >= 0 ? 'var(--sage)' : 'var(--rust)' }}>{fmt(realised)}</b></div>

      {events.length > 0 && <>
        <div className="section-title" style={{ margin: '16px 0 6px' }}>History</div>
        {events.map(ev => (
          <div className="event-line" key={ev.id}>
            <span style={{ color: ev.t === 'sale' ? 'var(--ochre)' : 'var(--rust)' }}>{ev.date} · {ev.text}</span>
            <button className="event-del" onClick={() => delEvent(ev.t, ev.id)}>✕</button>
          </div>
        ))}
      </>}

      {alive > 0 && <>
        <button className="btn primary" onClick={() => setMode('sell')}>Record sale</button>
        <button className="btn danger" onClick={() => setMode('death')}>Record death</button>
      </>}
      <button className="btn ghost" onClick={delBatch}>Delete batch</button>
    </Sheet>
  );
}

function SaleSheet({ batch, alive, store, userId, onClose, onDone }:
  { batch: Batch; alive: number; store: Store; userId: string; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState(today());
  const [count, setCount] = useState('');
  const [total, setTotal] = useState('');
  const [buyer, setBuyer] = useState('');
  const [busy, setBusy] = useState(false);

  async function confirm() {
    const c = parseInt(count) || 0, tot = parseFloat(total) || 0;
    if (c < 1) return;
    if (c > alive) { alert(`You only have ${alive} live goats in this batch.`); return; }
    setBusy(true);
    await supabase.from('sales').insert({ user_id: userId, batch_id: batch.id, date, count: c, total: tot, buyer: buyer.trim() || null });
    await store.refetch();
    setBusy(false);
    onDone();
  }

  return (
    <Sheet title="Record sale" sub={`${alive} live goats available in this batch.`} onClose={onClose}>
      <div className="row2">
        <div><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label>How many sold</label><input type="number" inputMode="numeric" value={count} onChange={e => setCount(e.target.value)} /></div>
      </div>
      <label>Total amount received (KES)</label>
      <input type="number" inputMode="decimal" value={total} placeholder="For all goats in this sale" onChange={e => setTotal(e.target.value)} />
      <label>Buyer (optional)</label>
      <input value={buyer} placeholder="e.g. Butchery, Nairobi" onChange={e => setBuyer(e.target.value)} />
      <button className="btn primary" disabled={busy} onClick={confirm}>Confirm sale</button>
    </Sheet>
  );
}

function DeathSheet({ batch, alive, store, userId, onClose, onDone }:
  { batch: Batch; alive: number; store: Store; userId: string; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState(today());
  const [count, setCount] = useState('');
  const [cause, setCause] = useState('');
  const [busy, setBusy] = useState(false);

  async function confirm() {
    const c = parseInt(count) || 0;
    if (c < 1) return;
    if (c > alive) { alert(`You only have ${alive} live goats in this batch.`); return; }
    setBusy(true);
    await supabase.from('deaths').insert({ user_id: userId, batch_id: batch.id, date, count: c, cause: cause.trim() || null });
    await store.refetch();
    setBusy(false);
    onDone();
  }

  return (
    <Sheet title="Record death" sub={`${alive} live goats in this batch.`} onClose={onClose}>
      <div className="row2">
        <div><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label>How many died</label><input type="number" inputMode="numeric" value={count} onChange={e => setCount(e.target.value)} /></div>
      </div>
      <label>Cause</label>
      <input value={cause} placeholder="e.g. Disease, predator, unknown" onChange={e => setCause(e.target.value)} />
      <button className="btn danger" disabled={busy} onClick={confirm}>Confirm death</button>
    </Sheet>
  );
}
