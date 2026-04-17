-- Supabase Database Schema for Stringers Friend
-- Run this in the Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. PROFILES TABLE (extends auth.users)
-- ============================================
-- First, add shop_id column if profiles table exists and column is missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'shop_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN shop_id UUID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  shop_id UUID,
  role TEXT DEFAULT 'customer' CHECK (role IN ('stringer', 'customer')),
  has_completed_onboarding BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key after shops table is created (below)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. SHOPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active shops" ON public.shops;
CREATE POLICY "Anyone can view active shops" 
  ON public.shops FOR SELECT 
  USING ((settings->>'is_active') IS NULL OR (settings->>'is_active') = 'true');

DROP POLICY IF EXISTS "Owners can manage their shops" ON public.shops;
CREATE POLICY "Owners can manage their shops" 
  ON public.shops FOR ALL 
  USING (auth.uid() = owner_id);

-- Add foreign key for profiles.shop_id after shops table exists
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_shop_id_fkey 
  FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE SET NULL;

-- ============================================
-- 3. CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shop owners can manage their customers" ON public.customers;
CREATE POLICY "Shop owners can manage their customers" 
  ON public.customers FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE shops.id = customers.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Customers can view own records" ON public.customers;
CREATE POLICY "Customers can view own records" 
  ON public.customers FOR SELECT 
  USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.shop_id = customers.shop_id
    )
  );

-- ============================================
-- 4. RACQUET SPECS CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.racquet_specs_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  head_size TEXT,
  string_pattern TEXT,
  tension_range TEXT,
  recommended_tension TEXT,
  stringing_instructions TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.racquet_specs_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read racquet specs cache" ON public.racquet_specs_cache;
CREATE POLICY "Anyone can read racquet specs cache" 
  ON public.racquet_specs_cache FOR SELECT 
  TO PUBLIC USING (true);

DROP POLICY IF EXISTS "Authenticated users can write to cache" ON public.racquet_specs_cache;
CREATE POLICY "Authenticated users can write to cache" 
  ON public.racquet_specs_cache FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 5. RACQUETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.racquets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT,
  qr_code_id TEXT UNIQUE,
  specs_id UUID REFERENCES public.racquet_specs_cache(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.racquets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shop owners can manage racquets for their customers" ON public.racquets;
CREATE POLICY "Shop owners can manage racquets for their customers" 
  ON public.racquets FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      JOIN public.shops s ON c.shop_id = s.id
      WHERE c.id = racquets.customer_id 
      AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Customers can view own racquets" ON public.racquets;
CREATE POLICY "Customers can view own racquets" 
  ON public.racquets FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      JOIN public.profiles p ON c.profile_id = p.id
      WHERE c.id = racquets.customer_id 
      AND p.id = auth.uid()
    )
  );

-- ============================================
-- 6. INVENTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('string', 'grip', 'dampener', 'other')),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  type TEXT CHECK (type IN ('reel', 'set', 'unit')),
  color TEXT,
  gauge TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC,
  low_stock_threshold NUMERIC NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shop owners can manage their inventory" ON public.inventory;
CREATE POLICY "Shop owners can manage their inventory" 
  ON public.inventory FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE shops.id = inventory.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

-- ============================================
-- 7. JOBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  racquet_id UUID REFERENCES public.racquets(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'delivered')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
  total_price NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shop owners can view jobs in their shop" ON public.jobs;
CREATE POLICY "Shop owners can view jobs in their shop" 
  ON public.jobs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE shops.id = jobs.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Shop owners can manage jobs in their shop" ON public.jobs;
CREATE POLICY "Shop owners can manage jobs in their shop" 
  ON public.jobs FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE shops.id = jobs.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Customers can view their own jobs" ON public.jobs;
CREATE POLICY "Customers can view their own jobs" 
  ON public.jobs FOR SELECT 
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE profile_id = auth.uid()
    )
  );

-- ============================================
-- 8. JOB_DETAILS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.job_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('main_string', 'cross_string', 'service', 'other')),
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  tension TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.job_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shop owners can view job details" ON public.job_details;
CREATE POLICY "Shop owners can view job details" 
  ON public.job_details FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.shops s ON j.shop_id = s.id
      WHERE j.id = job_details.job_id 
      AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Shop owners can manage job details" ON public.job_details;
CREATE POLICY "Shop owners can manage job details" 
  ON public.job_details FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.shops s ON j.shop_id = s.id
      WHERE j.id = job_details.job_id 
      AND s.owner_id = auth.uid()
    )
  );

-- ============================================
-- 9. MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('shop', 'customer')),
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shop owners can view messages" ON public.messages;
CREATE POLICY "Shop owners can view messages" 
  ON public.messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE shops.id = messages.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Shop owners can manage messages" ON public.messages;
CREATE POLICY "Shop owners can manage messages" 
  ON public.messages FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE shops.id = messages.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Customers can view their own messages" ON public.messages;
CREATE POLICY "Customers can view their own messages" 
  ON public.messages FOR SELECT 
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Customers can send messages" ON public.messages;
CREATE POLICY "Customers can send messages" 
  ON public.messages FOR INSERT 
  WITH CHECK (
    customer_id IN (
      SELECT id FROM public.customers WHERE profile_id = auth.uid()
    )
  );

-- ============================================
-- 10. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('message', 'job', 'payment', 'system')),
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" 
  ON public.notifications FOR SELECT 
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" 
  ON public.notifications FOR UPDATE 
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" 
  ON public.notifications FOR DELETE 
  USING (user_id = auth.uid());

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers to avoid errors
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_shops_updated_at ON public.shops;
DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
DROP TRIGGER IF EXISTS update_racquets_updated_at ON public.racquets;
DROP TRIGGER IF EXISTS update_inventory_updated_at ON public.inventory;
DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shops_updated_at 
  BEFORE UPDATE ON public.shops 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
  BEFORE UPDATE ON public.customers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_racquets_updated_at 
  BEFORE UPDATE ON public.racquets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at 
  BEFORE UPDATE ON public.inventory 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at 
  BEFORE UPDATE ON public.jobs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup (create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'customer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
