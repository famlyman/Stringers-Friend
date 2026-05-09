-- Migration to add unit support and fix inventory columns
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS length_unit TEXT DEFAULT 'm' CHECK (length_unit IN ('m', 'ft'));

-- Update deduction logic helper function if needed, but we'll do it in code for now.
-- Ensure packaging and category are consistently used.
DO $$ 
BEGIN 
  -- If we want to move data from 'type' to 'packaging'
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='type') THEN
    UPDATE public.inventory SET packaging = type WHERE packaging IS NULL;
  END IF;
END $$;
