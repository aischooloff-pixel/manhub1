-- Add subscription tier and bio to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'plus', 'premium')),
ADD COLUMN IF NOT EXISTS bio text;

-- Create user products table for premium users
CREATE TABLE public.user_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  price numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'RUB',
  media_url text,
  media_type text CHECK (media_type IN ('image', 'youtube')),
  link text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on user_products
ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;

-- Products are viewable by everyone
CREATE POLICY "Products are viewable by everyone" 
ON public.user_products 
FOR SELECT 
USING (is_active = true);

-- Service role can manage products
CREATE POLICY "Service role can manage products" 
ON public.user_products 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for user products
CREATE INDEX idx_user_products_user ON public.user_products(user_profile_id);
CREATE INDEX idx_user_products_active ON public.user_products(is_active) WHERE is_active = true;

-- Migrate existing is_premium to subscription_tier
UPDATE public.profiles 
SET subscription_tier = 'plus' 
WHERE is_premium = true AND subscription_tier = 'free';