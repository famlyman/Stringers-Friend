-- Create a table to track multiple devices per user
CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    onesignal_subscription_id TEXT NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(profile_id, onesignal_subscription_id)
);

-- Index for fast lookup by profile
CREATE INDEX IF NOT EXISTS idx_user_devices_profile_id ON public.user_devices(profile_id);

-- Add comment for documentation
COMMENT ON TABLE public.user_devices IS 'Stores multiple OneSignal subscription IDs per user to support multi-device push notifications.';

-- Enable Row Level Security
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own device IDs
CREATE POLICY "Users can insert their own devices" 
ON public.user_devices FOR INSERT 
WITH CHECK (auth.uid() = profile_id);

-- Policy: Users can view their own device IDs
CREATE POLICY "Users can view their own devices" 
ON public.user_devices FOR SELECT 
USING (auth.uid() = profile_id);

-- Policy: Users can update their own device IDs (last_seen_at)
CREATE POLICY "Users can update their own devices" 
ON public.user_devices FOR UPDATE 
USING (auth.uid() = profile_id);

-- Policy: Users can delete their own device IDs
CREATE POLICY "Users can delete their own devices" 
ON public.user_devices FOR DELETE 
USING (auth.uid() = profile_id);
