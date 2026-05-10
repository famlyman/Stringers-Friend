-- Migration to add missing columns to shops table
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Update existing shops if needed (optional)
-- UPDATE public.shops SET qr_code = slug WHERE qr_code IS NULL;
