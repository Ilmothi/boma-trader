import type { Batch, Sale, Death, Expense } from '../types';

export const fmt = (n: number) => 'KES ' + Math.round(n).toLocaleString('en-KE');
export const today = () => new Date().toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

export interface Data {
  batches: Batch[];
  sales: Sale[];
  deaths: Death[];
  expenses: Expense[];
}

export const salesFor = (d: Data, batchId: string) => d.sales.filter(s => s.batch_id === batchId);
export const deathsFor = (d: Data, batchId: string) => d.deaths.filter(x => x.batch_id === batchId);

export const soldCount = (d: Data, b: Batch) => salesFor(d, b.id).reduce((s, x) => s + x.count, 0);
export const deadCount = (d: Data, b: Batch) => deathsFor(d, b.id).reduce((s, x) => s + x.count, 0);
export const aliveCount = (d: Data, b: Batch) => b.head_count - soldCount(d, b) - deadCount(d, b);
export const salesRevenue = (d: Data, b: Batch) => salesFor(d, b.id).reduce((s, x) => s + x.total, 0);
export const isClosed = (d: Data, b: Batch) => aliveCount(d, b) <= 0;
export const totalHeadsBought = (d: Data) => d.batches.reduce((s, b) => s + b.head_count, 0);

// Direct batch expenses + share of general expenses split by head across all batches.
export const allocatedExpense = (d: Data, b: Batch) => {
  const totalHeads = totalHeadsBought(d) || 1;
  const direct = d.expenses
    .filter(e => e.scope === 'batch' && e.batch_id === b.id)
    .reduce((s, e) => s + e.amount, 0);
  const general = d.expenses
    .filter(e => e.scope === 'general')
    .reduce((s, e) => s + e.amount, 0);
  return direct + general * (b.head_count / totalHeads);
};

// Realised P&L: revenue - purchase cost of goats that left (sold+dead) - direct batch expenses.
export const batchRealised = (d: Data, b: Batch) => {
  const gone = soldCount(d, b) + deadCount(d, b);
  const directExp = d.expenses
    .filter(e => e.scope === 'batch' && e.batch_id === b.id)
    .reduce((s, e) => s + e.amount, 0);
  return salesRevenue(d, b) - b.cost_per_head * gone - directExp;
};

export interface HerdTotals {
  alive: number; sold: number; dead: number; totalBought: number;
  capital: number; revenue: number; expenses: number; profit: number; mortality: number;
}

export const herdTotals = (d: Data): HerdTotals => {
  const alive = d.batches.reduce((s, b) => s + aliveCount(d, b), 0);
  const sold = d.batches.reduce((s, b) => s + soldCount(d, b), 0);
  const dead = d.batches.reduce((s, b) => s + deadCount(d, b), 0);
  const totalBought = totalHeadsBought(d);
  const capital = d.batches.reduce((s, b) => s + aliveCount(d, b) * b.cost_per_head, 0);
  const revenue = d.batches.reduce((s, b) => s + salesRevenue(d, b), 0);
  const expenses = d.expenses.reduce((s, e) => s + e.amount, 0);
  const goneCost = d.batches.reduce((s, b) => s + (soldCount(d, b) + deadCount(d, b)) * b.cost_per_head, 0);
  const profit = revenue - goneCost - expenses;
  const mortality = totalBought ? (dead / totalBought) * 100 : 0;
  return { alive, sold, dead, totalBought, capital, revenue, expenses, profit, mortality };
};
