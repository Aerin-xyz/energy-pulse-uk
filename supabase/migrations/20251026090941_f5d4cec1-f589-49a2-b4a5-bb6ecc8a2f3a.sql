-- Fix infinite recursion in energy_data_history RLS policy
-- Note: energy_data_latest is a view and doesn't need RLS policies

-- Step 1: Create a security definer function to safely get the latest record ID
-- This prevents infinite recursion by executing with elevated privileges
CREATE OR REPLACE FUNCTION public.get_latest_energy_data_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM energy_data_history
  ORDER BY as_of DESC
  LIMIT 1
$$;

-- Step 2: Drop the problematic recursive policy on energy_data_history
DROP POLICY IF EXISTS "Allow public read access to latest data" ON public.energy_data_history;

-- Step 3: Create a new non-recursive policy using the security definer function
CREATE POLICY "Allow public read access to latest data"
ON public.energy_data_history
FOR SELECT
USING (id = public.get_latest_energy_data_id());

-- Step 4: Keep the existing service role policy unchanged
-- (The "Allow service role full access" policy already exists and should remain)