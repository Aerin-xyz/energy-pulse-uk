-- Approved Energy Mix security remediation, 23 October 2026.
-- Preserve separately defined public read policies. Existing unauthenticated admin UI may stop working.
-- Applied only after live revalidation and permission metadata backup.
BEGIN;
ALTER POLICY "Service role full access to newsletter_issues" ON public."newsletter_issues" TO service_role;
ALTER POLICY "Service role full access to ranked_items" ON public."ranked_items" TO service_role;
ALTER POLICY "Service role full access to raw_items" ON public."raw_items" TO service_role;
ALTER POLICY "Service role full access to send_logs" ON public."send_logs" TO service_role;
ALTER POLICY "Service role full access to snapshot_metrics" ON public."snapshot_metrics" TO service_role;
ALTER POLICY "Service role full access to social_posts" ON public."social_posts" TO service_role;
ALTER POLICY "Service role full access to summaries" ON public."summaries" TO service_role;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.newsletter_issues, public.ranked_items, public.raw_items, public.send_logs, public.snapshot_metrics, public.social_posts, public.summaries, public.api_cache, public.rate_limits, public.energy_data_history FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_cache(), public.cleanup_old_rate_limits(), public.increment_rate_limit(text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_cache(), public.cleanup_old_rate_limits(), public.increment_rate_limit(text,text,text,timestamptz) TO service_role;
COMMIT;
