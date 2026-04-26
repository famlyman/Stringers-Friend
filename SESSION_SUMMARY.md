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