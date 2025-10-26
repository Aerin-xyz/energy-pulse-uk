-- Fix search_path for rate limiting functions
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_function_name text,
  p_client_ip text,
  p_window_type text,
  p_window_start timestamptz
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - interval '2 hours';
END;
$$;