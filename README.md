# Boma Trader — Goat Trading Ledger

Buy goats by batch, hold, resell. Records live in Supabase (Postgres), so they
persist across devices and survive browser clears. Stack: Vite + React + TS +
Supabase + Netlify.

## 1. Create the Supabase project
1. Go to supabase.com, create a new project (pick a region near Kenya, e.g. `eu-central` or `ap-south`).
2. Open **SQL Editor**, paste the contents of `supabase/migrations/001_schema.sql`, and run it.
   Review it first — it defines the tables and the row-level-security policies that
   keep each account's data private.
3. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.

### Auth note
By default Supabase asks new users to confirm their email. For a solo app you can
turn that off under **Authentication → Providers → Email → Confirm email (off)**,
then just create one account and sign in. To share with a herder later, either
share that one login or create a second account (RLS keeps data per-account, so a
shared login is the way to share one herd).

## 2. Run locally
```bash
cp .env.example .env      # then paste your URL + anon key into .env
npm install
npm run dev               # open the printed localhost URL
```

## 3. Deploy to Netlify
- **Drag-and-drop:** run `npm run build`, then drag the `dist` folder into the
  Netlify drop zone. (You'll re-drag after changes.)
- **Git (auto-deploys):** push this folder to GitHub, "Add new site → Import",
  and in **Site settings → Environment variables** add `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`. Netlify runs `npm run build` and publishes `dist`.

On your phone, open the site URL and **Add to Home Screen** for an app-like icon.

## Data model
- **batches** — one lot bought together (market, date, head count, cost per goat, target hold).
- **sales / deaths** — events logged against a batch, by count, over time.
- **expenses** — general (split across the herd by head) or tied to a batch.
- **settings** — your Nairobi target.

Realised profit per batch = sales revenue − purchase cost of goats that left
(sold + died) − that batch's direct expenses. Goats still alive stay counted as
capital tied up, not yet profit or loss.
