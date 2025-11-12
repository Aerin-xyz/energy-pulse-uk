# Energy Mix Weekly Digest System

## Overview

Automated content curation and newsletter generation system for energymix.info. Collects news from 15+ institutional sources, scores relevance, generates summaries, and publishes weekly digests via email and LinkedIn.

## Architecture

### Database Tables

1. **raw_items** - All collected content (RSS, papers, expert posts)
2. **ranked_items** - Scored and ranked items per week
3. **summaries** - AI-generated one-line summaries
4. **snapshot_metrics** - Weekly energy generation statistics
5. **newsletter_issues** - Assembled newsletter HTML/text
6. **social_posts** - LinkedIn post drafts
7. **send_logs** - Publishing audit trail

### Agent Functions

**Daily (06:00 UK):**
- `collector-agent` - Fetches RSS feeds, Crossref papers, webhook content
- `scorer-agent` - Scores items based on keywords, source authority, recency
- `summariser-agent` - Generates 26-word summaries via Lovable AI

**Weekly (Friday 08:15 UK):**
- `snapshot-agent` - Computes weekly energy metrics from history
- `assembler-agent` - Creates newsletter HTML + 3 LinkedIn posts

**Manual (via Admin Console):**
- `publisher-agent` - Sends to MailerLite + LinkedIn webhook

**Webhook Intake:**
- `linkedin-ingest` - POST endpoint for expert content from Make/Zapier

## Setup Instructions

### 1. Environment Variables

Add these secrets via Supabase Dashboard → Project Settings → Edge Functions:

```bash
MAILERLITE_API_KEY=your_mailerlite_key
LINKEDIN_WEBHOOK_URL=https://hooks.make.com/your_webhook
LOVABLE_API_KEY=auto_provisioned  # Already set
```

### 2. Cron Scheduling

Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Daily collection at 06:00 UK time
SELECT cron.schedule(
  'daily-digest-collection',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/collector-agent',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dmpncHV5dGV6b21kbHNheWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjYwMDQsImV4cCI6MjA3MjE0MjAwNH0.cEnOyHqSeamIXVX4N3-nkuXerqLsEsSsRD1Iy3mo15o"}'::jsonb
  ) as request_id;
  $$
);

-- Daily scoring at 06:15 UK
SELECT cron.schedule(
  'daily-digest-scoring',
  '15 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/scorer-agent',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dmpncHV5dGV6b21kbHNheWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjYwMDQsImV4cCI6MjA3MjE0MjAwNH0.cEnOyHqSeamIXVX4N3-nkuXerqLsEsSsRD1Iy3mo15o"}'::jsonb
  ) as request_id;
  $$
);

-- Daily summarization at 06:30 UK
SELECT cron.schedule(
  'daily-digest-summarization',
  '30 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/summariser-agent',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dmpncHV5dGV6b21kbHNheWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjYwMDQsImV4cCI6MjA3MjE0MjAwNH0.cEnOyHqSeamIXVX4N3-nkuXerqLsEsSsRD1Iy3mo15o"}'::jsonb
  ) as request_id;
  $$
);

-- Weekly snapshot on Friday at 08:00 UK
SELECT cron.schedule(
  'weekly-snapshot',
  '0 8 * * 5',
  $$
  SELECT net.http_post(
    url := 'https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/snapshot-agent',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dmpncHV5dGV6b21kbHNheWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjYwMDQsImV4cCI6MjA3MjE0MjAwNH0.cEnOyHqSeamIXVX4N3-nkuXerqLsEsSsRD1Iy3mo15o"}'::jsonb
  ) as request_id;
  $$
);

-- Weekly assembly on Friday at 08:15 UK
SELECT cron.schedule(
  'weekly-assembly',
  '15 8 * * 5',
  $$
  SELECT net.http_post(
    url := 'https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/assembler-agent',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dmpncHV5dGV6b21kbHNheWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjYwMDQsImV4cCI6MjA3MjE0MjAwNH0.cEnOyHqSeamIXVX4N3-nkuXerqLsEsSsRD1Iy3mo15o"}'::jsonb
  ) as request_id;
  $$
);
```

**View scheduled jobs:**
```sql
SELECT * FROM cron.job;
```

**Delete a job:**
```sql
SELECT cron.unschedule('job-name');
```

### 3. Expert Content Integration

For experts without RSS (Liebreich, Ralston, etc.), set up Make/Zapier workflows:

**LinkedIn → Make.com → Webhook:**
1. Trigger: LinkedIn monitor for profile posts
2. Action: HTTP POST to `https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/linkedin-ingest`

**Payload format:**
```json
{
  "items": [
    {
      "source": "Michael Liebreich",
      "title": "Post title or first line",
      "summary": "Full text content",
      "url": "https://linkedin.com/post/...",
      "type": "headline",
      "published_at": "2025-11-12T10:00:00Z"
    }
  ]
}
```

### 4. MailerLite Setup

1. Get API key from https://dashboard.mailerlite.com/integrations/api
2. Verify sender domain at https://dashboard.mailerlite.com/settings/domains
3. Add `MAILERLITE_API_KEY` secret to Supabase

## Usage

### Admin Console

Navigate to: `https://energymix.info/admin/digest-preview?week=2025-45`

**Features:**
- View weekly snapshot metrics
- Toggle stories on/off
- Edit LinkedIn post text
- Preview newsletter HTML
- Approve → Publish workflow

**Status Flow:**
1. `draft` - Auto-generated, awaiting review
2. `approved` - Ready to publish
3. `sent` - Published to MailerLite + LinkedIn

### Manual Triggering

Test agents via Supabase Functions Dashboard or `curl`:

```bash
# Collect new content
curl -X POST https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/collector-agent \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Score this week's items
curl -X POST https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/scorer-agent \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"week": "2025-45"}'

# Generate summaries
curl -X POST https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/summariser-agent \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"week": "2025-45"}'

# Compute snapshot
curl -X POST https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/snapshot-agent \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"week": "2025-45"}'

# Assemble newsletter
curl -X POST https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/assembler-agent \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"week": "2025-45"}'
```

## Content Sources

### Institutional RSS Feeds (15)
- Carbon Brief, Current±, Ofgem, DESNZ, National Grid ESO
- IEA, Ember Climate, Carbon Tracker, Chatham House
- ECIU, Regen, RAP Europe, Grantham Institute, ESC

### Expert Individuals (4)
- Prof Dieter Helm (RSS + LinkedIn)
- Dr Jan Rosenow (Substack RSS + LinkedIn)
- Michael Liebreich (webhook only)
- Jess Ralston (webhook only)

### Academic Papers
- Crossref API: 20 most recent papers matching "UK electricity OR energy OR grid"

## Scoring Algorithm

**Keyword Matching:**
- High priority (3x): UK, Ofgem, ESO, National Grid, DESNZ
- Medium (2x): wind, solar, gas, interconnector, carbon
- Low (1x): energy, electricity, power

**Author Weighting:**
- Tier 1 (+3): Helm, Rosenow, Liebreich
- Tier 2 (+2): Ralston, ECIU, Carbon Brief, IEA, ESO
- Tier 3 (+1.5): Aurora, Chatham House

**Recency Boost:**
- <24 hours: +2
- <72 hours: +1

**Minimum Score:** 3.0 for inclusion

## Troubleshooting

### No content collected
- Check `send_logs` table for RSS fetch errors
- Verify cron jobs are running: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

### Low content warning
- Review scoring thresholds in `scorer-agent`
- Check if sources are publishing (test RSS URLs manually)

### Summaries not generating
- Check `LOVABLE_API_KEY` is configured
- Review `summariser-agent` logs in Supabase Functions dashboard

### Newsletter not sending
- Verify `MAILERLITE_API_KEY` is valid
- Check domain verification at MailerLite
- Review `send_logs` for error details

## Monitoring

**Check collection status:**
```sql
SELECT source, COUNT(*), MAX(published_at) 
FROM raw_items 
WHERE collected_at > NOW() - INTERVAL '7 days'
GROUP BY source;
```

**View top ranked items:**
```sql
SELECT r.score, ri.title, ri.source 
FROM ranked_items r
JOIN raw_items ri ON r.raw_item_id = ri.id
WHERE r.week = '2025-45'
ORDER BY r.score DESC
LIMIT 10;
```

**Check send success rate:**
```sql
SELECT entity_type, status, COUNT(*) 
FROM send_logs 
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY entity_type, status;
```

## Future Enhancements

- [ ] Generate actual chart PNGs for snapshot (using Chart.js + Puppeteer)
- [ ] Add more UK energy experts to sources
- [ ] Implement A/B testing for subject lines
- [ ] Add engagement analytics tracking
- [ ] Create weekly performance dashboard
- [ ] Automated LinkedIn direct posting (OAuth)
- [ ] RSS feed for the digest itself
