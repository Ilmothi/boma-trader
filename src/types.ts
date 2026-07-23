export interface Batch {
  id: string;
  user_id: string;
  name: string;
  market: string | null;
  purchase_date: string;
  head_count: number;
  cost_per_head: number;
  target_months: number;
  created_at: string;
}

export interface Sale {
  id: string;
  user_id: string;
  batch_id: string;
  date: string;
  count: number;
  total: number;
  buyer: string | null;
  created_at: string;
}

export interface Death {
  id: string;
  user_id: string;
  batch_id: string;
  date: string;
  count: number;
  cause: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  category: string;
  scope: 'general' | 'batch';
  batch_id: string | null;
  note: string | null;
  created_at: string;
}
