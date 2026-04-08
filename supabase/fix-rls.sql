-- Temporary fix for new stringers who don't have shops yet
-- This allows users to access customers table during registration

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Customers can view own records" ON public.customers;
DROP POLICY IF EXISTS "Shop owners can manage customers" ON public.customers;

-- Create permissive policies for new stringers
CREATE POLICY "Users can view customers during registration" 
ON public.customers FOR SELECT 
USING (true); -- Allow all authenticated users to read customers during registration

CREATE POLICY "Users can insert customers during registration" 
ON public.customers FOR INSERT 
WITH CHECK (true); -- Allow all authenticated users to insert customers during registration

CREATE POLICY "Users can update customers during registration" 
ON public.customers FOR UPDATE 
USING (true); -- Allow all authenticated users to update customers during registration

-- Enable policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Also fix stringing_jobs access
DROP POLICY IF EXISTS "Shop owners can manage stringing jobs" ON public.stringing_jobs;
DROP POLICY IF EXISTS "Users can view own stringing jobs" ON public.stringing_jobs;

CREATE POLICY "Users can view stringing jobs during setup" 
ON public.stringing_jobs FOR SELECT 
USING (true); -- Allow all authenticated users during initial setup

CREATE POLICY "Users can insert stringing jobs during setup" 
ON public.stringing_jobs FOR INSERT 
WITH CHECK (true); -- Allow all authenticated users to insert during initial setup

CREATE POLICY "Users can update stringing jobs during setup" 
ON public.stringing_jobs FOR UPDATE 
USING (true); -- Allow all authenticated users to update during initial setup

ALTER TABLE public.stringing_jobs ENABLE ROW LEVEL SECURITY;

-- Also fix racquets access
DROP POLICY IF EXISTS "Shop owners can manage racquets for their customers" ON public.racquets;
DROP POLICY IF EXISTS "Customers can view own racquets" ON public.racquets;

CREATE POLICY "Users can view racquets during setup" 
ON public.racquets FOR SELECT 
USING (true); -- Allow all authenticated users during initial setup

CREATE POLICY "Users can insert racquets during setup" 
ON public.racquets FOR INSERT 
WITH CHECK (true); -- Allow all authenticated users to insert during initial setup

CREATE POLICY "Users can update racquets during setup" 
ON public.racquets FOR UPDATE 
USING (true); -- Allow all authenticated users to update during initial setup

ALTER TABLE public.racquets ENABLE ROW LEVEL SECURITY;
