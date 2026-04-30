# Session Summary - 2026-04-30

## Completed Fixes & Enhancements

### Bug Fixes
1.  **Service Worker Conflict Resolved** - Unified multiple service worker files (`sw.js`, `OneSignalSDKWorker.js`) into a single Vite-generated `OneSignalSDKWorker.js`. This fixed the "Event handler of 'message' event must be added on initial evaluation" error.
2.  **Form Autofill & Accessibility** - Added missing `id`, `name`, and `autoComplete` attributes to form fields in `InventoryForm`, `ContactModal`, `AddRacquetForm`, `EditRacquetModal`, `ShopSetup`, `Login`, `Register`, and `Profile`.
3.  **Service Worker Caching** - Corrected `vercel.json` headers for the service worker to use `max-age=0, must-revalidate` instead of `immutable`, ensuring users receive app updates promptly.

### Performance Optimizations
1.  **Code Splitting** - Implemented `React.lazy` and `Suspense` in `App.tsx` to split the bundle by route. This reduces the initial download size and speeds up the first-page load.
2.  **Parallel Data Fetching** - Refactored `useDashboardData`, `useCustomerListData`, and `CustomerDashboard` to use `Promise.all` for fetching independent data sets (Jobs, Customers, Racquets, etc.) concurrently.
3.  **Dashboard Refactor** - Consolidated `Dashboard.tsx` to use the optimized `useDashboardData` hook, removing redundant state and background subscriptions.
4.  **Database Indexing** - Created `supabase/performance_indexes.sql` containing recommended indexes for high-traffic foreign key columns (`shop_id`, `customer_id`, etc.) to optimize query performance.

---

# Session Summary - 2026-04-29

## Completed Fixes & Enhancements

### Bug Fixes
1. **Customers Tab Crash** - Fixed a `TypeError` in `EditRacquetModal.tsx` by adding a null check for `editingRacquet`. This was causing the dashboard to crash when navigating to the Customers tab.
2. **OneSignal Service Worker Conflict** - Resolved the `[WM] No SW registration for postMessage` error by consolidating the PWA and OneSignal Service Workers.
    - Moved PWA caching logic into `public/OneSignalSDKWorker.js`.
    - Disabled redundant standalone SW registration in `src/main.tsx`.
3. **ReferenceError: inventoryStrings** - Fixed a missing variable destructuring in `Dashboard.tsx` that was preventing the New Job modal from opening.

### "Create New Job" Form Refactor (NewJobModal.tsx)
4. **Existing Racquet Selection** - The form now supports selecting from a customer's existing racquets instead of always requiring a new one.
5. **Hybrid Stringing Support** - Added a toggle to switch between "Full Bed" and "Hybrid" setups.
6. **Detailed Service Section** - Expanded the service area with:
    - Smart string selection (brand/model/gauge) for both Mains and Crosses.
    - Individual pricing for labor, main strings, and cross strings.
    - Real-time total job price calculation.
7. **Accessibility & Autofill Improvements** - Added missing `id`, `name`, and `autoComplete` attributes to all form fields in `NewJobModal.tsx` and `AddCustomerForm.tsx` to resolve browser warnings and improve user experience.

---

# Session Summary - 2026-04-25

## Completed Fixes

### Registration Logic Fixes (Register.tsx)
1. **Error handling** - Registration errors during customer creation now properly throw and display to user instead of failing silently
2. **Customer linking** - Linking existing customer records now handles errors properly
3. **Profile upsert** - Changed from insert to upsert in auth context to handle race conditions where profile may already exist

### PublicShop.tsx Fixes
4. **is_lead column** - Removed reference to non-existent `is_lead` column in customers table
5. **user_id vs profile_id** - Fixed handleJoinShop to use `profile_id` instead of non-existent `user_id` column

### RLS Policy Fixes (supabase/schema.sql)
6. **Customers INSERT** - Added policy allowing anyone to insert customer records
7. **Messages INSERT** - Added policy allowing anyone to send messages

### Dashboard Cleanup
8. **New Job redundant button** - Removed "New Job" button next to search bar

### Profile Cleanup
9. **Notifications card** - Removed push notifications card from profile page

### CustomerMessages.tsx Fixes
10. **Realtime subscription** - Fixed duplicate subscription issue by moving to dedicated useEffect with proper cleanup

### CustomerList.tsx Enhancements
11. **Racquet expand** - Racquets now expand inline horizontally showing details (head size, pattern, string length, strings, tension, instructions)
12. **QR Code button** - Added QR code icon button in expanded racquet card that opens QR modal
13. **Edit/Delete Icons** - Changed buttons to icon-only for cleaner UI

---

## Database Changes Required

Run this SQL in Supabase SQL Editor for RLS policies:

```sql
-- Allow anyone to insert customers (for service requests)
DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customers;
CREATE POLICY "Anyone can insert customers"
  ON public.customers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anyone to send messages
DROP POLICY IF EXISTS "Customers can send messages" ON public.messages;
CREATE POLICY "Anyone can send messages"
  ON public.messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
```

---

## Previously Completed
- Messaging feature (completed)
- PublicShop contact modal (completed)
- Racquet Specs Admin (completed)

---

## Remaining Issues
- Hole numbering conversion for stringing instructions (skipped for now)