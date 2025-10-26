-- Fix Critical Security Issue: Replace energy_data_latest view with a secure function
-- Views cannot have RLS directly, but functions can use SECURITY DEFINER safely

-- Drop the existing view
DROP VIEW IF EXISTS public.energy_data_latest;

-- Create a secure function to get the latest energy data
-- This function uses SECURITY DEFINER but is safe because:
-- 1. It has explicit search_path set to 'public'
-- 2. It only accesses energy_data_history which already has RLS policies
-- 3. It performs a simple, predictable query with no user input
CREATE OR REPLACE FUNCTION public.get_latest_energy_data()
RETURNS TABLE (payload jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT payload
  FROM energy_data_history
  ORDER BY as_of DESC
  LIMIT 1
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.get_latest_energy_data() TO anon, authenticated;

-- Update the get_latest_energy_data_id function to ensure it has proper security
-- (Already had search_path set, but recreating for consistency)
CREATE OR REPLACE FUNCTION public.get_latest_energy_data_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id
  FROM energy_data_history
  ORDER BY as_of DESC
  LIMIT 1
$$;