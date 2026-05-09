-- Migration to fix inventory table schema
-- Add missing columns and update constraints

ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS packaging TEXT,
ADD COLUMN IF NOT EXISTS total_length NUMERIC,
ADD COLUMN IF NOT EXISTS remaining_length NUMERIC,
ADD COLUMN IF NOT EXISTS grip_type TEXT,
ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- If 'category' column doesn't exist but 'item_type' does (from old migration)
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='item_type') THEN
    ALTER TABLE public.inventory RENAME COLUMN item_type TO category;
  END IF;
END $$;

-- Ensure category check constraint is correct
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_category_check;
ALTER TABLE public.inventory ADD CONSTRAINT inventory_category_check 
CHECK (category IN ('string', 'grip', 'dampener', 'other', 'overgrip', 'accessory'));
