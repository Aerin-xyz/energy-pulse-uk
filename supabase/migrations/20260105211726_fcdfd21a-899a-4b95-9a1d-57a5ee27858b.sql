-- Ensure RLS is enabled on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might allow public access
DROP POLICY IF EXISTS "Allow public read access" ON public.rate_limits;
DROP POLICY IF EXISTS "Allow anonymous read access" ON public.rate_limits;
DROP POLICY IF EXISTS "Public read access" ON public.rate_limits;

-- Force RLS for table owner as well (prevents bypassing RLS)
ALTER TABLE public.rate_limits FORCE ROW LEVEL SECURITY;