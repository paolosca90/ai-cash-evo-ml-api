-- Add payment method fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('crypto', 'stripe')),
ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'cancelled', 'expired'));

-- Create index for payment method queries
CREATE INDEX IF NOT EXISTS idx_profiles_payment_method ON public.profiles(payment_method);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);