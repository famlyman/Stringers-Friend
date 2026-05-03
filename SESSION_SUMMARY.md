# Session Summary - 2026-05-02

## Completed Fixes & Enhancements

### OneSignal v16 & Multi-Device Push (Phase 3)
1.  **SDK v16 Migration** - Fully migrated OneSignal integration to the modern **v16 Web SDK**. Replaced deprecated `getUserId()` with `OneSignal.User.PushSubscription.id` and updated REST API calls to use the standardized `include_subscription_ids` parameter.
2.  **Multi-Device Support** - Implemented a new `user_devices` table in Supabase to track multiple OneSignal Subscription IDs per user. This allows a user (e.g., a Stringer) to receive push notifications on their MacBook and Android device simultaneously.
3.  **Smart Routing & Self-Filtering** - 
    *   Updated `sendNotification` to broadcast messages to all registered devices for a recipient.
    *   Implemented automatic **"Self-Notification" filtering** that prevents the sender's current device from ringing for an action they just performed.
    *   Added uniqueness logic in `Layout.tsx` to ensure a device ID is only associated with one user profile at a time, preventing "ghost" notifications.
4.  **Authorization Header Standard** - Updated all server-side and API functions to use the explicit `Authorization: Key <REST_API_KEY>` format required by the latest OneSignal security standards.

### Performance & Stability Optimization
1.  **"Nuclear" Service Worker Reset** - Added a one-time reset script in `main.tsx` that unregisters stale Service Workers. This resolves the persistent "hang on refresh" issue seen on MacBook and Android devices.
2.  **Non-Blocking Auth Flow** - Refactored `SupabaseAuthContext.tsx` to prioritize the user session. The app now allows the UI to render as soon as a session is found, fetching the detailed profile in the background. This eliminated the infinite loading loop and the "Throttling navigation" browser errors.
3.  **Dashboard Query Optimization** - Simplified queries in `useDashboardData.ts` by removing slow `!inner` joins in favor of direct filtering. This significantly reduced the dashboard's initial load time and improved reliability on mobile networks.
4.  **Network Resilience** - Added safety timeouts and robust error handling to the profile fetching process, ensuring the app stays functional even during temporary database connectivity dips.

---

# Session Summary - 2026-04-30

## Completed Fixes & Enhancements

### Strict Typing Migration (Phase 1)
1.  **Centralized Type Definitions** - Created `src/types/database.ts` with comprehensive TypeScript interfaces for all core models (`Profile`, `Shop`, `Job`, `Customer`, `Racquet`, `InventoryItem`, `Message`, `JobDetail`).
2.  **Hook Type Safety** - Updated all major custom hooks (`useDashboardData`, `useInventoryData`, `useCustomerListData`, `usePublicShopData`) to return strictly typed data, eliminating dozens of `any[]` and `any` usages.
3.  **Context Typing** - Refactored `SupabaseAuthContext.tsx` to use strict types for user profiles and auth responses, ensuring safer user state management across the app.
4.  **Component Type Migration** - Systematically updated major page components and their sub-components to use strict types:
    *   `Dashboard.tsx` & sub-components (`JobsTab`, `CustomersTab`, `InventoryTab`, `StatsGrid`, `NewJobModal`).
    *   `Inventory.tsx` & sub-components (`InventoryTable`, `InventoryForm`, `AddInventoryModal`, `EditInventoryModal`).
    *   `CustomerList.tsx` & sub-components (`CustomerSidebar`, `CustomerDetailsCard`, `RacquetCard`, `RacquetQRModal`).
    *   `PublicShop.tsx` & sub-components (`PublicShopHero`, `ShopInfoSidebar`, `ContactModal`, `CustomerCTA`, `PublicShopFooter`).
    *   `Profile.tsx`, `Messages.tsx`, `CustomerMessages.tsx`, `Layout.tsx`, and `ShopSetup.tsx`.
5.  **Syntax Error Fix** - Fixed a critical build error in `EditInventoryModal.tsx` where a missing `return` statement was causing compilation failure.

### Inventory Automation (Phase 2)
1.  **Auto-linking Job to Inventory** - Modified `NewJobModal` to automatically search for matching strings in inventory (by brand/model) when creating a new job. These are now linked via `inventory_id` in the `job_details` table.
2.  **Smart Stock Deduction** - Updated `JobsTab.tsx` to automatically deduct materials from inventory when a job is marked as **"Completed"**:
    *   **Sets/Units:** Decrements quantity by 1.
    *   **Reels:** Decrements `remaining_length` by 12m (for full bed) or 6m (for hybrid/half piece).
    *   **Auto-Rollover:** If a reel is exhausted, the system automatically starts a new reel from stock (decrementing quantity and resetting remaining length).
3.  **Hybrid Tracking Support** - The system now correctly handles and deducts two different strings for hybrid stringing setups.

### Bug Fixes & Infrastructure
1.  **Revenue Card Fix** - Updated `useDashboardData.ts` to calculate revenue based on all non-cancelled "active" jobs instead of just "paid" jobs, as there is currently no UI to mark payment.
2.  **Content Security Policy (CSP) Refinement** - Updated `vercel.json` to allow necessary connections for OneSignal and Supabase WebSockets (`wss://inqysjfrwfttngymydnw.supabase.co`), resolving "transportConnect failed" console errors.
3.  **Service Worker Unification** - Unified Workbox and OneSignal into a single Vite-generated `OneSignalSDKWorker.js` with correct initialization order to satisfy browser requirements.
4.  **Form Accessibility** - Added missing `id`, `name`, and `autoComplete` attributes to all application forms for better browser autofill support.

---

# Session Summary - 2026-04-29
... (previous summaries kept unchanged)
