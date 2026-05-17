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
- API: `server.ts` (dev), `api/send-notification.ts` (Vercel)
- Schema: `supabase/schema.sql`
- OneSignal worker: `src/OneSignalSDKWorker.ts` (compiled to root)

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
- OneSignal SDK v16 loaded in `index.html` from `https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js`
- Service worker at `/OneSignalSDKWorker.js` imports `https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js`
- API endpoint: `POST /api/send-notification` (Vercel serverless in `/api/send-notification.ts`)
- API URL: `https://api.onesignal.com/notifications` (not onesignal.com)
- Auth header: `Key ${ONESIGNAL_REST_API_KEY}` (not Basic)

### How it works
1. User subscribes via OneSignal prompt (triggered by "Enable" button in Layout)
2. Player ID saved to `profiles.onesignal_player_id` via `getOneSignalPlayerId()`
3. Notifications sent via `/api/send-notification` endpoint using OneSignal REST API
4. Triggers: new messages (shop owner + customer), job completion

### To send notifications from code
```typescript
import { sendNotification } from './lib/notifications';
await sendNotification(playerId, 'Title', 'Message body', { type: 'job', job_id: '...' });
```

### Environment Variables (Vercel + .env.local)
- `ONESIGNAL_APP_ID` = `133fd1be-b1e9-4664-a061-8a1a66e3e7f3`
- `ONESIGNAL_REST_API_KEY` = (from OneSignal dashboard > Settings > Keys & IDs)
- `VITE_ONESIGNAL_APP_ID` = `133fd1be-b1e9-4664-a061-8a1a66e3e7f3`

## QR Code System
- **Racquet QR** -> encodes `/r/{racquet-uuid}`
- **Route** `/r/:id` -> RacquetPage (standalone, shows racquet specs without auth)
- **Shop QR** -> encodes `/{shop-slug}` -> PublicShop page
- **Print Label** (14mm x 40mm): QR code + customer name + serial + shop name + "Powered by Stringer's Friend"

## Racquet Data Flow
1. Create racquet -> generates UUID, sets `id` = `qr_code_id` = UUID
2. QR displays -> `/r/{uuid}` encoded
3. Scan -> Opens RacquetPage showing current strings, tension, specs

## QR Code Label (14mm x 40mm Niimbot)
- Left: QR code (10mm x 10mm, scans to `/r/{uuid}`)
- Right columns:
  - Customer name (large, uppercase)
  - Serial number: last 4 digits ("SN: XXXX" or "N/A")
  - Shop name
  - "Powered by Stringer's Friend" (medium gray)
- Print output renders via window.print (print template in `handlePrint`)
- Image download via html-to-image (`generateImage`)
- Hidden element at 686px x 240px for image generation

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

## Recent Changes (May 2026)
### Push Notifications (OneSignal)
- Added OneSignal SDK integration with VitePWA-compatible service worker
- Service worker at `/OneSignalSDKWorker.js` to avoid conflicts
- API endpoint `/api/send-notification` for server-side notification sending
- Notifications triggered on: new messages, job completion
- Customer notification button in Layout with 24h cooldown
- **Fixed (May 2026):** OneSignal SDK URLs corrected to `web/v16/` format (was 404ing)
- **Fixed (May 2026):** API endpoint updated to `api.onesignal.com/notifications` with `Key` auth header
- **Fixed (May 2026):** Created Vercel serverless API routes in `/api/` directory
- **Fixed (May 2026):** Added `dotenv` to server for environment variable loading

### Fixed Null User Errors
- Fixed `CustomerMessages.tsx` - Added null guard for `user` prop (was causing "Cannot read properties of null (reading 'id')")
- Fixed `Messages.tsx` - Added null guards for `user` and `user?.shop_id` throughout component

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

### Create Job — Existing Racquet Selection
- Replaced inline create-job form in `Dashboard.tsx` with the `NewJobModal` component
- Inline form only had brand/model inputs (always created new racquet)
- Now supports selecting existing racquet from customer's racquets, or adding a new one

### QR Code Label Simplified
- Removed string/tension/date info from label, now shows: QR code, customer name, SN (last 4), shop name, "Powered by Stringer's Friend"
- Resized label to 40mm x 14mm for Niimbot compatibility (was 80mm x 14mm)
- Hidden image element now 686px x 240px

### Inventory Deduction Fixes
- Fixed `findInventoryId` in `NewJobModal.tsx:190-200` — now falls back to model-only and substring matching when exact brand+model doesn't match inventory
- Fixed `useDashboardData.ts:68` — inventory string filter now checks both `category` and `item_type` columns
- Previously `inventory_id` was never linked in `job_details` due to brand/model mismatch, so completion never deducted inventory

### Auth Sync Fix
- Fixed `SupabaseAuthContext.tsx` — `loading` now stays `true` until profile is actually fetched, instead of being set `false` as soon as session is found
- Previously caused "Sync Delayed" screen on every page load because `AppRoutes` rendered with `user && !profile`
- Reduced `fetchProfile` retries from 5 to 2 for faster fallback
- Added 12s safety timeout to prevent infinite loading

### Dashboard Fixes (Apr 2026)
- Restored "Create Job" button beside search bar in Jobs tab (was removed during cleanup)
- Fixed revenue card not pulling data:
  - Changed from counting only `payment_status === 'paid'` to all non-cancelled jobs
  - Jobs created start as `unpaid` with no UI to mark paid, so revenue now shows total of all active jobs
- Fixed `shop_id` vs `shopId` mismatch in data fetching (Dashboard.tsx:262-300)
  - Now uses `user?.shop_id || user?.shopId` consistently
- Fixed Customers tab crash (ReferenceError: UserPlus is not defined):
  - Added missing `UserPlus` and `ChevronRight` imports to `src/components/customers/CustomerSidebar.tsx:2`

## Quirks
- PWA plugin includes `icon.svg` - update manifest in `vite.config.ts` if needed
- tsconfig excludes `supabase/functions` (Deno code, not TS)
- VitePWA `injectRegister: false` to prevent service worker conflicts with OneSignal
