# Project Assessment: Stringers Friend

### Current State

**Stringers Friend** is a well-structured racquet stringing shop management PWA built with React 19, Vite 6, Express SSR, and Supabase. The foundation is solid, but there are several areas that could be improved.

---

### Strengths

1. **Modern Tech Stack** - React 19, Vite 6, Tailwind CSS v4, Express for SSR
2. **Comprehensive Database Schema** - Well-designed tables with proper RLS policies
3. **Real-time Ready** - Supabase subscriptions already implemented
4. **PWA Support** - Workbox configured, icons, manifest ready
5. **Dark Mode** - Proper implementation with CSS variables
6. **QR Code System** - Good for physical shop integration
7. **Dual Role System** - Shop owners vs customers with separate dashboards

---

### Critical Issues to Fix

#### 1. **Schema/Code Mismatches** ⚠️

The code and schema don't align in several places, causing potential bugs:

| Location | Schema Expects | Code Uses |
|----------|----------------|-----------|
| `customers` | `first_name`, `last_name` | `name` |
| `customers` | `profile_id` | `user_id` |
| `jobs` table | `jobs` | CustomerDashboard queries `stringing_jobs` |
| `inventory` | `unit_price` | Code uses `price` |
| `profiles` | `role` ('stringer'/'customer') | ✅ Fixed - now aligned |

**Fix needed:** Standardize on one naming convention throughout.

#### 2. **Type Safety** ⚠️

Heavy use of `any` types throughout:
- `UserProfile` interface uses `any` for `shop_id`
- Dashboard props: `user: any`
- Inventory items all typed as `any`

**Fix needed:** Enable strict TypeScript and define proper interfaces.

#### 3. **Massive Components** ⚠️

- `Dashboard.tsx`: ~900 lines
- `PublicShop.tsx`: ~865 lines  
- `Inventory.tsx`: ~655 lines

These should be split into smaller, focused components.

---

### Architecture Improvements

#### 1. **Missing Data Layer**

Currently, components directly call Supabase:
```typescript
// This pattern is repeated everywhere
const { data, error } = await supabase.from('jobs').select('*')...
```

**Recommendation:** Create a proper data layer:

```
src/
├── lib/
│   └── supabase.ts          # Existing
├── services/                # New - business logic
│   ├── jobService.ts
│   ├── customerService.ts
│   └── inventoryService.ts
├── hooks/                  # New - data fetching
│   ├── useJobs.ts
│   ├── useCustomers.ts
│   └── useInventory.ts
└── types/                  # New - shared types
    └── index.ts
```

#### 2. **State Management**

All state is local `useState`. For a growing app, consider:
- **Zustand** - lightweight, simple
- **TanStack Query** - for server state (recommended)

#### 3. **No Form Validation**

The `handleCreateJob` function in Dashboard.tsx does manual validation. Consider:
- **Zod** (already in dependencies!) for schema validation
- **react-hook-form** for form handling

---

### Specific Code Issues

#### 1. **Hardcoded FIXED_SERVICES in PublicShop.tsx**
```typescript
const FIXED_SERVICES = [
  { id: 'string_full_bed', name: 'String Job Full Bed', price: 25, ... },
  // Hardcoded!
]
```
Services should come from the shop's inventory/settings, not be hardcoded.

#### 2. **CustomerDashboard Uses Wrong Table**
```typescript
const { data: jobsData } = await supabase
  .from('stringing_jobs')  // Should be 'jobs'
  .select('*')
```

#### 3. **Debug Logging Left in Production**

`AuthContext.tsx` has extensive `console.log` statements:
```typescript
console.log('AuthContext - initializing...');
console.log('fetchProfile called for userId:', userId);
```

---

### Missing/Incomplete Features

| Feature | Status | Notes |
|---------|--------|-------|
| Push Notifications | TODO | Prompt UI exists but feature disabled |
| Messages (Customer) | Placeholder | "Messages feature coming soon" |
| Job Search/Filter | Missing | Can only view all jobs |
| Job Details | Incomplete | Only creates main_string, no cross_string |
| Reel Inventory Tracking | Partial | `remaining_length` tracked but not updated when jobs created |
| Job Status Notifications | Missing | No notification when job status changes |
| Shop Settings | Minimal | Only name/address in schema, no pricing templates |

---

### Performance Opportunities

1. **Multiple Subscriptions for Same Data**
```typescript
// In Dashboard - three separate subscriptions for data that could be fetched once
const jobsSubscription = supabase.channel(`jobs:${user.shop_id}`)...
const customersSubscription = supabase.channel(`customers:${user.shop_id}`)...
const messagesSubscription = supabase.channel(`messages:${user.shop_id}`)...
```

2. **No Loading Skeletons** - Just spinners

3. **No Memoization** - Large lists will re-render unnecessarily

---

### Security Considerations

1. **Environment Variable Exposure**
```typescript
// In vite.config.ts
define: {
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
}
```
Ensure this is properly scoped and not exposed to client.

2. **No Rate Limiting** on public endpoints like `/contact`

3. **Debug Mode** - Consider removing verbose logging before production

---

### Recommended Roadmap

**Phase 1: Fix Critical Bugs**
1. Align schema and code naming conventions
2. Fix CustomerDashboard table references
3. Add TypeScript strict mode

**Phase 2: Architecture**
1. Create service layer for data access
2. Add TanStack Query for server state
3. Split large components (Dashboard, PublicShop)

**Phase 3: Features**
1. Complete messages feature
2. Add job search/filter
3. Implement inventory deduction on job completion
4. Add job status notifications

**Phase 4: Polish**
1. Add loading skeletons
2. Complete push notifications
3. Add comprehensive error boundaries
4. Write tests

---

### Quick Wins

1. **Remove debug logging** from AuthContext
2. **Enable TypeScript strict mode** in tsconfig.json
3. **Move FIXED_SERVICES** to database configuration
4. **Add JSDoc comments** to service functions
5. **Create shared types file** for common interfaces
