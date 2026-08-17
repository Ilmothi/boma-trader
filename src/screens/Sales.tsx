import { supabase } from '../supabase';
import type { Store } from '../lib/store';
import { fmt } from '../lib/calc';

export function Sales({ store }: { store: Store }) {
  const sales = store.batches
    .flatMap(b => store.sales.filter(s => s.batch_id === b.id).map(s => ({ ...s, bn: b.name })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalRevenue = sales.reduce((s, x) => s + x.total, 0);
  const totalGoats = sales.reduce((s, x) => s + x.count, 0);

  async function del(id: string) {
    if (!confirm('Delete this sale? The goats will return to the live count.')) return;
    await supabase.from('sales').delete().eq('id', id);
    await store.refetch();
  }

  return (
    <div className="screen">
      <div className="stat-grid" style={{ marginBottom: 14 }}>
        <div className="stat-card"><div className="label">Goats sold</div><div className="value">{totalGoats}</div></div>
        <div className="stat-card"><div className="label">Total revenue</div><div className="value acc">{fmt(totalRevenue)}</div></div>
      </div>

      {sales.length === 0
        ? <div className="empty"><div className="glyph">₪</div><p>No sales recorded yet.</p><p>Open a batch and tap Record sale.</p></div>
        : sales.map(s => (
          <div className="exp-row" key={s.id}>
            <div>
              <div className="cat">{s.count} goat{s.count > 1 ? 's' : ''} sold</div>
              <div className="note">{s.bn}</div>
              <div className="sub">{s.date}{s.buyer ? ' · ' + s.buyer : ''} · {fmt(s.total / s.count)}/goat</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="amt" style={{ color: 'var(--ochre)' }}>{fmt(s.total)}</div>
              <button className="del" onClick={() => del(s.id)}>✕</button>
            </div>
          </div>
        ))}
    </div>
  );
}
