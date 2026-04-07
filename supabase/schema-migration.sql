-- ============================================================================
-- MIGRATION SCHEMA: Modified to accept Firestore string IDs
-- Run this in Supabase SQL Editor BEFORE running the migration script
-- ============================================================================

-- First, drop existing tables (cascade to remove dependencies)
-- This will also drop associated policies and triggers automatically
DROP TABLE IF EXISTS public.stringing_jobs CASCADE;
DROP TABLE IF EXISTS public.racquets CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.shops CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.racquet_specs_cache CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Drop trigger on auth.users if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================================================
-- 1. PROFILES TABLE (extends auth.users)
-- NOTE: id stays as UUID because it references auth.users
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('stringer', 'customer')),
  shop_id TEXT,  -- Changed from UUID to TEXT for Firestore ID compatibility
  name TEXT,
  phone TEXT,
  notifications_enabled BOOLEAN DEFAULT false,
  fcm_token TEXT,
  last_token_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. SHOPS TABLE (id changed to TEXT for Firestore compatibility)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shops (
  id TEXT PRIMARY KEY,  -- Changed from UUID to TEXT
  owner_id TEXT NOT NULL,  -- Changed from UUID to TEXT (references Firestore user IDs)
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active shops" 
  ON public.shops FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Owners can manage their shops" 
  ON public.shops FOR ALL 
  USING (auth.uid()::text = owner_id);  -- Cast auth.uid() to text for comparison

-- ============================================================================
-- 3. CUSTOMERS TABLE (ids changed to TEXT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,  -- Changed from UUID to TEXT
  shop_id TEXT NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,  -- Changed to TEXT
  user_id TEXT,  -- Changed to TEXT, removed FK constraint (Firestore IDs don't match auth.users UUIDs)
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can manage their customers" 
  ON public.customers FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE shops.id = customers.shop_id 
      AND shops.owner_id = auth.uid()::text
    )
  );

CREATE POLICY "Customers can view own records" 
  ON public.customers FOR SELECT 
  USING (
    user_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.shop_id = customers.shop_id
    )
  );

-- ============================================================================
-- 4. RACQUETS TABLE (ids changed to TEXT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.racquets (
  id TEXT PRIMARY KEY,  -- Changed from UUID to TEXT
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,  -- Changed to TEXT
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT,
  purchase_date DATE,
  condition TEXT,
  grip_size TEXT,
  weight TEXT,
  balance TEXT,
  string_pattern TEXT,
  notes TEXT,
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.racquets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can manage racquets for their customers" 
  ON public.racquets FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      JOIN public.shops s ON c.shop_id = s.id
      WHERE c.id = racquets.customer_id 
      AND s.owner_id = auth.uid()::text
    )
  );

CREATE POLICY "Customers can view own racquets" 
  ON public.racquets FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      JOIN public.profiles p ON c.user_id::uuid = p.id
      WHERE c.id = racquets.customer_id 
      AND p.id = auth.uid()
    )
  );

-- ============================================================================
-- 5. STRINGING JOBS TABLE (ids changed to TEXT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stringing_jobs (
  id TEXT PRIMARY KEY,  -- Changed from UUID to TEXT
  shop_id TEXT NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,  -- Changed to TEXT
  customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,  -- Changed to TEXT
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  racquet_brand TEXT,
  racquet_model TEXT,
  string_brand TEXT,
  string_model TEXT,
  tension_mains INTEGER,
  tension_crosses INTEGER,
  tension_unit TEXT DEFAULT 'lbs',
  string_pattern_mains INTEGER,
  string_pattern_crosses INTEGER,
  pre_stretch BOOLEAN DEFAULT false,
  hybrid_stringing BOOLEAN DEFAULT false,
  mains_string_brand TEXT,
  mains_string_model TEXT,
  crosses_string_brand TEXT,
  crosses_string_model TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delivered', 'cancelled')),
  due_date DATE,
  qr_code TEXT,
  price DECIMAL(10,2),
  paid BOOLEAN DEFAULT false,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.stringing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can view jobs in their shop" 
  ON public.stringing_jobs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE shops.id = stringing_jobs.shop_id 
      AND shops.owner_id = auth.uid()::text
    )
  );

CREATE POLICY "Shop owners can manage jobs in their shop" 
  ON public.stringing_jobs FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE shops.id = stringing_jobs.shop_id 
      AND shops.owner_id = auth.uid()::text
    )
  );

CREATE POLICY "Customers can view their own jobs" 
  ON public.stringing_jobs FOR SELECT 
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- 6. INVENTORY TABLE (ids changed to TEXT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inventory (
  id TEXT PRIMARY KEY,  -- Changed from UUID to TEXT
  shop_id TEXT NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,  -- Changed to TEXT
  item_type TEXT NOT NULL CHECK (item_type IN ('string', 'grip', 'overgrip', 'accessory')),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT,
  gauge TEXT,
  length TEXT,
  material TEXT,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5,
  cost_price DECIMAL(10,2),
  retail_price DECIMAL(10,2),
  supplier_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can manage their inventory" 
  ON public.inventory FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE shops.id = inventory.shop_id 
      AND shops.owner_id = auth.uid()::text
    )
  );

-- ============================================================================
-- 7. RACQUET SPECS CACHE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.racquet_specs_cache (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  specs JSONB,
  results JSONB,
  query TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.racquet_specs_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read racquet specs cache" 
  ON public.racquet_specs_cache FOR SELECT 
  TO PUBLIC USING (true);

CREATE POLICY "Authenticated users can write to cache" 
  ON public.racquet_specs_cache FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update cache" 
  ON public.racquet_specs_cache FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- 8. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('message', 'job', 'payment', 'system')),
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" 
  ON public.notifications FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" 
  ON public.notifications FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" 
  ON public.notifications FOR DELETE 
  USING (user_id = auth.uid());

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER update_stringing_jobs_updated_at 
  BEFORE UPDATE ON public.stringing_jobs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at 
  BEFORE UPDATE ON public.inventory 
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

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
