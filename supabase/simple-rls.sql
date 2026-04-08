-- Simple RLS policies that avoid type casting issues
-- Uses simple string comparison approach

-- Re-enable RLS first (in case it was disabled)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stringing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.racquets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.racquet_specs_cache ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Users can manage stringing jobs" ON public.stringing_jobs;
DROP POLICY IF EXISTS "Users can manage racquets" ON public.racquets;
DROP POLICY IF EXISTS "Shop owners can manage their shops" ON public.shops;
DROP POLICY IF EXISTS "Users can manage their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their inventory" ON public.inventory;

-- ============================================
-- SIMPLE POLICIES (avoid type casting)
-- ============================================

-- Customers Table - Simple approach
CREATE POLICY "Users can manage customers" 
ON public.customers FOR ALL 
USING (
  auth.uid() IS NOT NULL
);

-- Stringing Jobs Table - Simple approach  
CREATE POLICY "Users can manage stringing jobs" 
ON public.stringing_jobs FOR ALL 
USING (
  auth.uid() IS NOT NULL
);

-- Racquets Table - Simple approach
CREATE POLICY "Users can manage racquets" 
ON public.racquets FOR ALL 
USING (
  auth.uid() IS NOT NULL
);

-- Shops Table - Only for shop owners
CREATE POLICY "Shop owners can manage their shops" 
ON public.shops FOR ALL 
USING (
  owner_id = auth.uid()
)
WITH CHECK (
  owner_id = auth.uid()
);

-- Profiles Table - Users can manage their own profiles
CREATE POLICY "Users can manage their own profiles" 
ON public.profiles FOR ALL 
USING (
  id = auth.uid()
)
WITH CHECK (
  id = auth.uid()
);

-- Inventory Table - Simple approach
CREATE POLICY "Users can manage inventory" 
ON public.inventory FOR ALL 
USING (
  auth.uid() IS NOT NULL
);

SELECT 'Simple RLS policies applied - authenticated users can access tables' as status;
