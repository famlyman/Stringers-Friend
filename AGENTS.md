# AGENTS.md

## Dev Commands
- `npm run dev` - Start dev server (runs Express + Vite via tsx)
- `npm run build` - Build for production (Vite + esbuild server)
- `npm run lint` - TypeScript check (tsc --noEmit)

## Architecture
- React 19 + Vite + Express server (SSR via Vite middleware in dev, esbuild in prod)
- Auth: Supabase Auth (see `src/lib/supabase.ts`, `src/context/SupabaseAuthContext.tsx`)
- Database: Supabase PostgreSQL with RLS policies (schema in `supabase/schema.sql`)
- Notifications: Supabase Edge Functions (`supabase/functions/`)

## Setup Requirements
1. Copy `.env.example` to `.env.local` with Supabase credentials
2. Run `supabase/schema.sql` in Supabase SQL Editor
3. Deploy edge functions: `supabase functions deploy send-notification`

## Key Paths
- Pages: `src/pages/`
- Auth: `src/context/SupabaseAuthContext.tsx`
- Supabase client: `src/lib/supabase.ts`
- Schema: `supabase/schema.sql`

## Database Tables
- `shops` - Shop owners and their business
- `profiles` - User accounts linked to auth.users
- `customers` - Shop customers (first_name, last_name, email, phone)
- `racquets` - Customer racquets with specs
- `jobs` - Stringing jobs with status and payment tracking
- `job_details` - Per-job stringing details (main_string, cross_string, service)
- `inventory` - Strings, grips, dampeners, accessories
- `messages` - Shop/customer messaging
- `notifications` - User notifications

## Quirks
- PWA plugin includes `icon.svg` - update manifest in `vite.config.ts` if needed
- tsconfig excludes `supabase/functions` (Deno code, not TS)

## QR Code System
- **Racquet QR** -> encodes `/r/{racquet-uuid}` 
- **Route** `/r/:id` -> RacquetPage (standalone, shows racquet specs without auth)
- **Shop QR** -> encodes `/{shop-slug}` -> PublicShop page

## Racquet Data Flow
1. Create racquet -> generates UUID, sets `id` = `qr_code_id` = UUID
2. QR displays -> `/r/{uuid}` encoded
3. Scan -> Opens RacquetPage showing current strings, tension, specs

## Public Access RLS Policies
For QR codes to work without authentication, these policies must be deployed:
```sql
-- In supabase/schema.sql already - run in SQL Editor to activate
DROP POLICY IF EXISTS "Anyone can view racquets" ON public.racquets;
CREATE POLICY "Anyone can view racquets"
  ON public.racquets FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view customers" ON public.customers;
CREATE POLICY "Anyone can view customers"
  ON public.customers FOR SELECT TO anon, authenticated USING (true);
```

## Recent Changes (Apr 2026)
### Auth Performance Fixes
- Added session fallback: If `getSession()` fails, tries `getUser()` directly to handle token refresh issues
- Added 5-second timeout with recovery UI: Shows "Connection Issue" with "Try Again" button instead of blocking error
- The auth context (`src/context/SupabaseAuthContext.tsx`) now handles edge cases where:
  - User is logged in but session token needs refresh on page reload
  - Supabase query hangs due to network issues
  - Profile fetch times out
