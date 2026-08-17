import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// True when either var is missing/blank. App.tsx uses this to show a setup
// message instead of letting createClient throw "Invalid URL" and blank the page.
export const configMissing = !url || !anon;

// Fall back to a syntactically valid placeholder so createClient never throws
// at import time. Real calls fail gracefully and surface in the UI.
export const supabase = createClient(
  url && url.startsWith('http') ? url : 'https://placeholder.supabase.co',
  anon || 'placeholder'
);
