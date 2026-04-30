# AGENTS.md

## Dev Commands
- `npm run dev` - Start dev server (runs Express + Vite via tsx)
- `npm run build` - Build for production (Vite + esbuild server)
- `npm run lint` - TypeScript check (tsc --noEmit)

## Architecture
- React 19 + Vite + Express server (SSR via Vite middleware in dev, esbuild in prod)
- Auth: Supabase Auth (see `src/lib/supabase.ts`, `src/context/SupabaseAuthContext.tsx`)
- Database: Supabase PostgreSQL with RLS policies (schema in `supabase/schema.sql`)
- Push Notifications: OneSignal (SDK + REST API)

## Setup Requirements
1. Copy `.env.example` to `.env.local` with Supabase credentials
2. Run `supabase/schema.sql` in Supabase SQL Editor
3. Add OneSignal columns to profiles table:
   ```sql
   ALTER TABLE public.profiles ADD COLUMN onesignal_player_id TEXT;
   ```
4. Update profiles RLS policy to allow viewing all profiles:
   ```sql
   DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
   CREATE POLICY "Authenticated users can view all profiles"
     ON public.profiles FOR SELECT
     TO authenticated
     USING (true);
   ```
5. Add OneSignal environment variables to Vercel:
   - `ONESIGNAL_APP_ID` (133fd1be-b1e9-4664-a061-8a1a66e3e7f3)
   - `ONESIGNAL_REST_API_KEY` (from OneSignal dashboard > Settings > Keys & IDs)

## Key Paths
- Pages: `src/pages/`
- Auth: `src/context/SupabaseAuthContext.tsx`
- Supabase client: `src/lib/supabase.ts`
- Notifications: `src/lib/notifications.ts`
- API: `server.ts`
- Schema: `supabase/schema.sql`
- OneSignal worker: `public/OneSignalSDKWorker.js`

## Database Tables
- `shops` - Shop owners and their business
- `profiles` - User accounts linked to auth.users (includes `onesignal_player_id`)
- `customers` - Shop customers (first_name, last_name, email, phone)
- `racquets` - Customer racquets with specs
- `jobs` - Stringing jobs with status and payment tracking
- `job_details` - Per-job stringing details (main_string, cross_string, service)
- `inventory` - Strings, grips, dampeners, accessories
- `messages` - Shop/customer messaging
- `notifications` - User notifications

## Push Notifications (OneSignal)
### Setup
- OneSignal SDK loaded in `index.html` with service worker at `/OneSignalSDKWorker.js`
- CSP headers in `vercel.json` allow OneSignal domains
- API endpoint: `POST /api/send-notification` (in `server.ts`)

### How it works
1. User subscribes via OneSignal slidedown prompt
2. Player ID saved to `profiles.onesignal_player_id` on login
3. Notifications sent via `/api/send-notification` endpoint
4. Triggers: new messages, job completion

### To send notifications from code
```typescript
import { sendNotification } from './lib/notifications';
await sendNotification(playerId, 'Title', 'Message body', { type: 'job', job_id: '...' });
```

## QR Code System
- **Racquet QR** -> encodes `/r/{racquet-uuid}`
- **Route** `/r/:id` -> RacquetPage (standalone, shows racquet specs without auth)
- **Shop QR** -> encodes `/{shop-slug}` -> PublicShop page
- **Print Label** (14mm x 30mm): QR code + customer name + mains/crosses string info + tension

## Racquet Data Flow
1. Create racquet -> generates UUID, sets `id` = `qr_code_id` = UUID
2. QR displays -> `/r/{uuid}` encoded
3. Scan -> Opens RacquetPage showing current strings, tension, specs

## QR Code Label (14mm x 30mm)
- Left: QR code (scans to `/r/{uuid}` - RacquetPage with live stringing data)
- Right columns:
  - Customer name (top)
  - Mains string: brand/model tension (e.g., "Luxilon ALU Power 1.25 55 lbs")
  - Crosses string: brand/model tension
  - Racquet: brand/model (e.g., "Babolat Pure Drive")
- Font: 5pt for label, consistent sizing

## Public Access RLS Policies
For QR codes to work without authentication, these policies must be deployed:
```sql
DROP POLICY IF EXISTS "Anyone can view racquets" ON public.racquets;
CREATE POLICY "Anyone can view racquets"
  ON public.racquets FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view customers" ON public.customers;
CREATE POLICY "Anyone can view customers"
  ON public.customers FOR SELECT TO anon, authenticated USING (true);
```

## Recent Changes (Apr 2026)
### Push Notifications (OneSignal)
- Added OneSignal SDK integration with VitePWA-compatible service worker
- Service worker at `/OneSignalSDKWorker.js` to avoid conflicts
- API endpoint `/api/send-notification` for server-side notification sending
- Notifications triggered on: new messages, job completion
- Customer notification button in Layout with 24h cooldown

### QR Code Label Improvements
- Updated print label format: QR + customer name + strings + tension
- Separate hidden element for image download (matches print output)
- Added `customerName`, `stringMain`, `stringCross`, `tensionMain`, `tensionCross` props to QRCodeDisplay
- Added "QR Code" button in CustomerList for each racquet

### Auth Performance Fixes
- Added session fallback: If `getSession()` fails, tries `getUser()` directly to handle token refresh issues
- Added 5-second timeout with recovery UI: Shows "Connection Issue" with "Try Again" button instead of blocking error
- The auth context (`src/context/SupabaseAuthContext.tsx`) now handles edge cases where:
  - User is logged in but session token needs refresh on page reload
  - Supabase query hangs due to network issues
  - Profile fetch times out

### Dashboard Fixes (Apr 2026)
- Restored "Create Job" button beside search bar in Jobs tab (was removed during cleanup)
- Fixed revenue card not pulling data:
  - Changed from counting only `payment_status === 'paid'` to all non-cancelled jobs
  - Jobs created start as `unpaid` with no UI to mark paid, so revenue now shows total of all active jobs
- Fixed `shop_id` vs `shopId` mismatch in data fetching (Dashboard.tsx:262-300)
  - Now uses `user?.shop_id || user?.shopId` consistently

## Quirks
- PWA plugin includes `icon.svg` - update manifest in `vite.config.ts` if needed
- tsconfig excludes `supabase/functions` (Deno code, not TS)
- VitePWA `injectRegister: false` to prevent service worker conflicts with OneSignal
