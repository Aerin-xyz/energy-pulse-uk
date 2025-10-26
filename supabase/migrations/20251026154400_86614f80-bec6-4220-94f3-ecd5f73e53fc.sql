-- Cache table for storing API responses
CREATE TABLE IF NOT EXISTS public.api_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  data jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_api_cache_key ON public.api_cache(cache_key);
CREATE INDEX idx_api_cache_expires ON public.api_cache(expires_at);

-- Automatic cleanup of expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.api_cache WHERE expires_at < now();
END;
$$;

-- Enable RLS
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access to cache
CREATE POLICY "Service role has full access to cache"
  ON public.api_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Anonymous users can read cache (for edge functions)
CREATE POLICY "Allow anonymous read access"
  ON public.api_cache
  FOR SELECT
  TO anon
  USING (expires_at > now());