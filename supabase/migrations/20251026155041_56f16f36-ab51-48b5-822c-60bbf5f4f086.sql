-- Create rate_limits table for database-based rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  client_ip text NOT NULL,
  window_type text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_rate_limit UNIQUE (function_name, client_ip, window_type, window_start)
);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits(function_name, client_ip, window_type, window_start);
CREATE INDEX idx_rate_limits_cleanup ON public.rate_limits(window_start);

-- Function to atomically increment rate limit counters
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_function_name text,
  p_client_ip text,
  p_window_type text,
  p_window_start timestamptz
)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.rate_limits (function_name, client_ip, window_type, window_start, request_count)
  VALUES (p_function_name, p_client_ip, p_window_type, p_window_start, 1)
  ON CONFLICT (function_name, client_ip, window_type, window_start)
  DO UPDATE SET 
    request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_count;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old rate limit entries (older than 2 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - interval '2 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to rate_limits"
  ON public.rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);