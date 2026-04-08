-- Complete RLS disable for testing
-- This will completely disable row level security temporarily

-- Disable RLS on all tables
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stringing_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.racquets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.racquet_specs_cache DISABLE ROW LEVEL SECURITY;

-- Drop all policies to be safe
DROP POLICY IF EXISTS "Users can view customers during registration" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers during registration" ON public.customers;
DROP POLICY IF EXISTS "Users can update customers during registration" ON public.customers;
DROP POLICY IF EXISTS "Users can view stringing jobs during setup" ON public.stringing_jobs;
DROP POLICY IF EXISTS "Users can insert stringing jobs during setup" ON public.stringing_jobs;
DROP POLICY IF EXISTS "Users can update stringing jobs during setup" ON public.stringing_jobs;
DROP POLICY IF EXISTS "Users can view racquets during setup" ON public.racquets;
DROP POLICY IF EXISTS "Users can insert racquets during setup" ON public.racquets;
DROP POLICY IF EXISTS "Users can update racquets during setup" ON public.racquets;

-- Log what we did
SELECT 'RLS temporarily disabled on all tables for testing' as status;
