import type { Store } from '../lib/store';
import {
  fmt, aliveCount, soldCount, deadCount, batchRealised,
} from '../lib/calc';

export function Reports({ store }: { store: Store }) {
  const cats: Record<string, number> = {};
  store.expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
  const catTotal = Object.values(cats).reduce((a, b) => a + b, 0) || 1;
  const catEntries = Object.entries(cats).sort((a, b) => b[1] - a[1]);

  const sales = store.batches.flatMap(b => store.sales.filter(s => s.batch_id === b.id).map(s => ({ ...s, bn: b.name })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const deaths = store.batches.flatMap(b => store.deaths.filter(d => d.batch_id === b.id).map(d => ({ ...d, bn: b.name, cph: b.cost_per_head })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="screen">
      <div className="section-title">Expense breakdown</div>
      {catEntries.length === 0
        ? <div className="empty"><p>No expenses yet.</p></div>
        : catEntries.map(([n, a]) => (
          <div className="herd-gauge" style={{ padding: '10px 14px', marginBottom: 8 }} key={n}>
            <div className="gauge-row" style={{ margin: 0 }}>
              <span className="gauge-label" style={{ width: 'auto', flex: 1, fontSize: '0.85rem', color: 'var(--cream)' }}>{n}</span>
              <span className="mono" style={{ fontSize: '0.85rem' }}>{fmt(a)}</span>
            </div>
            <div className="gauge-track" style={{ marginTop: 6 }}><div className="gauge-fill" style={{ width: (a / catTotal * 100) + '%', background: 'var(--ochre)' }} /></div>
          </div>
        ))}

      <div className="section-title">Profit by batch</div>
      {store.batches.length === 0
        ? <div className="empty"><p>No batches yet.</p></div>
        : store.batches.map(b => {
          const r = batchRealised(store, b);
          return (
            <div className="batch-card" style={{ cursor: 'default' }} key={b.id}>
              <div className="row1"><span className="name">{b.name}</span>
                <span className="mono" style={{ color: r >= 0 ? 'var(--sage)' : 'var(--rust)' }}>{fmt(r)}</span></div>
              <div className="sub">{aliveCount(store, b)} live · {soldCount(store, b)} sold · {deadCount(store, b)} died</div>
            </div>
          );
        })}

      <div className="section-title">Sales ledger</div>
      {sales.length === 0
        ? <div className="empty"><p>No sales recorded yet.</p></div>
        : sales.map(s => (
          <div className="exp-row" key={s.id}>
            <div><div className="note">{s.count} goat{s.count > 1 ? 's' : ''} — {s.bn}</div>
              <div className="sub">{s.date}{s.buyer ? ' · ' + s.buyer : ''}</div></div>
            <div className="amt" style={{ color: 'var(--ochre)' }}>{fmt(s.total)}</div>
          </div>
        ))}

      <div className="section-title">Mortality ledger</div>
      {deaths.length === 0
        ? <div className="empty"><p>No losses recorded. Long may that continue.</p></div>
        : deaths.map(d => (
          <div className="exp-row" key={d.id}>
            <div><div className="note">{d.count} goat{d.count > 1 ? 's' : ''} — {d.bn}</div>
              <div className="sub">{d.date} · {d.cause || 'unknown cause'}</div></div>
            <div className="amt" style={{ color: 'var(--rust)' }}>{fmt(d.count * d.cph)}</div>
          </div>
        ))}
    </div>
  );
}
