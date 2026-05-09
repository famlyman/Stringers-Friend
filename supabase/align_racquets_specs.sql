-- Migration to align racquets table with the official technical specifications cache
ALTER TABLE public.racquets 
ADD COLUMN IF NOT EXISTS recommended_tension TEXT,
ADD COLUMN IF NOT EXISTS tension_range TEXT,
ADD COLUMN IF NOT EXISTS string_pattern TEXT;

-- We keep the split fields in 'racquets' because they are useful for logic,
-- but ensure they can be populated from the text fields in the cache.
