-- Ensure RLS is enabled on send_logs table
ALTER TABLE public.send_logs ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might allow public access
DROP POLICY IF EXISTS "Allow public read access" ON public.send_logs;
DROP POLICY IF EXISTS "Allow anonymous read access" ON public.send_logs;
DROP POLICY IF EXISTS "Public read access" ON public.send_logs;

-- Force RLS for table owner as well (prevents bypassing RLS)
ALTER TABLE public.send_logs FORCE ROW LEVEL SECURITY;