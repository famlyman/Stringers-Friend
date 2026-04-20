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
