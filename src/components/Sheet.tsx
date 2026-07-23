import type { ReactNode } from 'react';

export function Sheet({ title, sub, onClose, children }: {
  title: string; sub?: string; onClose: () => void; children: ReactNode;
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <button className="close-x" onClick={onClose}>✕</button>
        <h3>{title}</h3>
        {sub && <div className="sheet-sub">{sub}</div>}
        {children}
      </div>
    </div>
  );
}
