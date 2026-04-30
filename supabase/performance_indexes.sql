-- Migration to add missing indexes for performance optimization
-- Run this in the Supabase SQL Editor

-- Profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_shop_id ON public.profiles(shop_id);

-- Customers table
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_profile_id ON public.customers(profile_id);

-- Racquets table
CREATE INDEX IF NOT EXISTS idx_racquets_customer_id ON public.racquets(customer_id);
CREATE INDEX IF NOT EXISTS idx_racquets_shop_id ON public.racquets(shop_id);

-- Inventory table
CREATE INDEX IF NOT EXISTS idx_inventory_shop_id ON public.inventory(shop_id);

-- Jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_shop_id ON public.jobs(shop_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON public.jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_racquet_id ON public.jobs(racquet_id);

-- Job Details table
CREATE INDEX IF NOT EXISTS idx_job_details_job_id ON public.job_details(job_id);
CREATE INDEX IF NOT EXISTS idx_job_details_inventory_id ON public.job_details(inventory_id);

-- Messages table
CREATE INDEX IF NOT EXISTS idx_messages_shop_id ON public.messages(shop_id);
CREATE INDEX IF NOT EXISTS idx_messages_customer_id ON public.messages(customer_id);

-- Notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
