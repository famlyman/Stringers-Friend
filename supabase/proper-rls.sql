-- Proper RLS policies that handle both normal operation and bootstrap case
-- Keeps security enabled while allowing new stringers to register

-- Re-enable RLS first (in case it was disabled)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stringing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.racquets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.racquet_specs_cache ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view customers during registration" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers during registration" ON public.customers;
DROP POLICY IF EXISTS "Users can update customers during registration" ON public.customers;
DROP POLICY IF EXISTS "Users can view stringing jobs during setup" ON public.stringing_jobs;
DROP POLICY IF EXISTS "Users can insert stringing jobs during setup" ON public.stringing_jobs;
DROP POLICY IF EXISTS "Users can update stringing jobs during setup" ON public.stringing_jobs;
DROP POLICY IF EXISTS "Users can view racquets during setup" ON public.racquets;
DROP POLICY IF EXISTS "Users can insert racquets during setup" ON public.racquets;
DROP POLICY IF EXISTS "Users can update racquets during setup" ON public.racquets;

-- ============================================
-- PROPER POLICIES
-- ============================================

-- Customers Table Policies
CREATE POLICY "Users can manage customers" 
ON public.customers FOR ALL 
USING (
  -- Normal case: User owns the shop
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid()::text 
    AND profiles.shop_id::text = customers.shop_id
  )
  OR
  -- Bootstrap case: User is creating their first customer (no shop yet)
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid()::text 
    AND profiles.shop_id IS NOT NULL
  )
)
WITH CHECK (
  -- For INSERT: Allow creating customers if user owns the shop OR has no shop yet
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid()::text 
    AND (
      (profiles.shop_id::text = customers.shop_id) 
      OR profiles.shop_id IS NULL
    )
  )
  OR
  -- For UPDATE: Same logic as USING
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid()::text 
    AND (
      (profiles.shop_id::text = customers.shop_id) 
      OR profiles.shop_id IS NULL
    )
  )
);

-- Stringing Jobs Table Policies  
CREATE POLICY "Users can manage stringing jobs" 
ON public.stringing_jobs FOR ALL 
USING (
  -- Normal case: User owns the shop
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid()::text 
    AND profiles.shop_id::text = stringing_jobs.shop_id
  )
  OR
  -- Bootstrap case: User is creating their first job (no shop yet)
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid()::text 
    AND profiles.shop_id IS NOT NULL
  )
)
WITH CHECK (
  -- For INSERT/UPDATE: Allow if user owns shop OR has no shop yet
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid()::text 
    AND (
      (profiles.shop_id::text = stringing_jobs.shop_id) 
      OR profiles.shop_id IS NULL
    )
  )
);

-- Racquets Table Policies
CREATE POLICY "Users can manage racquets" 
ON public.racquets FOR ALL 
USING (
  -- Normal case: User owns the shop through customer
  EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.profiles p ON c.shop_id::text = p.id
    WHERE c.id = racquets.customer_id 
    AND p.id = auth.uid()::text
  )
  OR
  -- Bootstrap case: User is creating their first racquet (no shop yet)
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid()::text 
    AND profiles.shop_id IS NOT NULL
  )
)
WITH CHECK (
  -- For INSERT/UPDATE: Allow if user owns shop through customer OR has no shop yet
  EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.profiles p ON c.shop_id::text = p.id
    WHERE c.id = racquets.customer_id 
    AND p.id = auth.uid()::text
  )
  OR
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid()::text 
    AND profiles.shop_id IS NOT NULL
  )
);

-- Shops Table Policies (only for users with shops)
CREATE POLICY "Shop owners can manage their shops" 
ON public.shops FOR ALL 
USING (owner_id = auth.uid()::text)
WITH CHECK (owner_id = auth.uid()::text);

-- Profiles Table Policies
CREATE POLICY "Users can manage their own profiles" 
ON public.profiles FOR ALL 
USING (id = auth.uid()::text)
WITH CHECK (id = auth.uid()::text);

-- Inventory Table Policies
CREATE POLICY "Users can manage their inventory" 
ON public.inventory FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid()::text 
    AND profiles.shop_id::text = inventory.shop_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid()::text 
    AND profiles.shop_id::text = inventory.shop_id
  )
);

SELECT 'Proper RLS policies applied - security enabled with bootstrap support' as status;
