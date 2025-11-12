-- Weekly Digest System Tables

-- 1. Raw collected items from all sources
CREATE TABLE IF NOT EXISTS public.raw_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('headline', 'paper')),
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  raw_data JSONB,
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  content_hash TEXT UNIQUE,
  CONSTRAINT unique_content UNIQUE (content_hash)
);

-- 2. Scored and ranked items
CREATE TABLE IF NOT EXISTS public.ranked_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_item_id UUID REFERENCES public.raw_items(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  score_factors JSONB,
  week TEXT NOT NULL,
  ranked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_included BOOLEAN DEFAULT true,
  CONSTRAINT unique_ranked_item UNIQUE (raw_item_id, week)
);

-- 3. AI-generated summaries
CREATE TABLE IF NOT EXISTS public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ranked_item_id UUID REFERENCES public.ranked_items(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  word_count INTEGER,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  model_used TEXT
);

-- 4. Weekly snapshot metrics
CREATE TABLE IF NOT EXISTS public.snapshot_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week TEXT UNIQUE NOT NULL,
  avg_wind NUMERIC,
  avg_gas NUMERIC,
  avg_solar NUMERIC,
  avg_ci NUMERIC,
  biggest_swing TEXT,
  chart_url TEXT,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metrics_data JSONB
);

-- 5. Newsletter issues
CREATE TABLE IF NOT EXISTS public.newsletter_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent')),
  subject TEXT,
  html_content TEXT,
  text_content TEXT,
  snapshot_id UUID REFERENCES public.snapshot_metrics(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE
);

-- 6. Social media posts
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID REFERENCES public.newsletter_issues(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'linkedin',
  post_type TEXT NOT NULL CHECK (post_type IN ('summary', 'chart', 'outlook')),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- 7. Send logs for tracking
CREATE TABLE IF NOT EXISTS public.send_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('newsletter', 'social_post')),
  entity_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  provider TEXT,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.raw_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranked_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshot_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Service role full access, public read for approved content only
CREATE POLICY "Service role full access to raw_items" ON public.raw_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ranked_items" ON public.ranked_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to summaries" ON public.summaries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to snapshot_metrics" ON public.snapshot_metrics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to newsletter_issues" ON public.newsletter_issues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to social_posts" ON public.social_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to send_logs" ON public.send_logs FOR ALL USING (true) WITH CHECK (true);

-- Public read access to approved newsletters
CREATE POLICY "Public read approved newsletters" ON public.newsletter_issues FOR SELECT USING (status = 'approved' OR status = 'sent');

-- Performance indexes
CREATE INDEX idx_raw_items_published ON public.raw_items(published_at DESC);
CREATE INDEX idx_raw_items_source ON public.raw_items(source);
CREATE INDEX idx_ranked_items_week ON public.ranked_items(week);
CREATE INDEX idx_ranked_items_score ON public.ranked_items(score DESC);
CREATE INDEX idx_newsletter_issues_week ON public.newsletter_issues(week);
CREATE INDEX idx_send_logs_entity ON public.send_logs(entity_type, entity_id);