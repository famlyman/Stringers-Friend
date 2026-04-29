# Stringer's Friend - Future Roadmap (TODO)

This roadmap outlines the prioritized tasks following the major architectural refactor completed in April 2026.

## Phase 1: Technical Debt & Type Safety (High Priority)
- [ ] **Strict Typing Migration**: Replace `any` types in `useDashboardData`, `useInventoryData`, and all extracted components with proper TypeScript interfaces.
- [ ] **Global Error Boundary**: Implement a more robust error handling strategy for custom hooks to prevent UI crashes on network/Supabase errors.
- [ ] **Code Cleanup**: Remove unused imports and legacy code in `src/pages/` that was replaced by modular components.

## Phase 2: Inventory Automation (Feature Priority)
- [ ] **Job Completion Trigger**: Create a Supabase Edge Function or a frontend hook to automatically deduct string length/sets from inventory when a job status is updated to `completed`.
- [ ] **Low Stock Notifications**: Implement real-time alerts or emails when inventory falls below the `low_stock_threshold`.
- [ ] **Hybrid String Tracking**: Correctly track two different strings in inventory for "Hybrid" jobs.

## Phase 3: Notifications & Communication
- [ ] **Push Notification Engine**: Complete the integration with OneSignal/Supabase Edge Functions to send real-time browser notifications to customers when their racquet is ready.
- [ ] **Message Read Receipts**: Add visual indicators for read/unread messages in the shop dashboard.
- [ ] **Automated Email Intake**: Send an automated "Thank You/Order Received" email when a customer submits a public service request.

## Phase 4: Polish & Performance
- [ ] **Loading Skeletons**: Replace full-page spinners with skeleton loaders for `StatsGrid` and `InventoryTable`.
- [ ] **Search Optimization**: Implement debouncing on the search inputs in `CustomerList` and `Inventory` to improve performance on large datasets.
- [ ] **Unit Testing**: Add Vitest/Testing Library tests for the new custom hooks (`useInventoryData`, etc.) and core utility functions.

## Phase 5: Mobile & Offline
- [ ] **Offline Job Creation**: Queue job creation requests when offline and sync with Supabase when connectivity returns.
- [ ] **QR Scanner UX**: Improve the scanner interface to handle low-light conditions and multiple racquet tags.

---
*Created: 2026-04-30*
