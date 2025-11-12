import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Scoring configuration
const KEYWORDS = {
  high: ['UK', 'Ofgem', 'ESO', 'National Grid', 'DESNZ', 'CfD', 'capacity market'],
  medium: ['wind', 'solar', 'gas', 'interconnector', 'carbon', 'flexibility', 'storage', 'hydrogen'],
  low: ['energy', 'electricity', 'power', 'generation', 'grid', 'renewable'],
};

const AUTHOR_WEIGHTS: Record<string, number> = {
  'Prof Dieter Helm': 3,
  'Dr Jan Rosenow': 3,
  'Michael Liebreich': 3,
  'Jess Ralston': 2,
  'RAP Europe': 2,
  'ECIU': 2,
  'Regen': 2,
  'Carbon Tracker': 2,
  'Carbon Brief': 2,
  'IEA': 2,
  'National Grid ESO': 2,
  'Aurora Energy Research': 1.5,
  'Chatham House': 1.5,
};

interface ScoreFactors {
  keyword_score: number;
  author_weight: number;
  recency_boost: number;
  total: number;
  matched_keywords: string[];
}

function scoreContent(title: string, summary: string | null, source: string, publishedAt: string): ScoreFactors {
  const content = `${title} ${summary || ''}`.toLowerCase();
  let keywordScore = 0;
  const matchedKeywords: string[] = [];

  // Keyword scoring
  for (const [weight, keywords] of Object.entries(KEYWORDS)) {
    const multiplier = weight === 'high' ? 3 : weight === 'medium' ? 2 : 1;
    for (const keyword of keywords) {
      if (content.includes(keyword.toLowerCase())) {
        keywordScore += multiplier;
        matchedKeywords.push(keyword);
      }
    }
  }

  // Author/source weighting
  const authorWeight = AUTHOR_WEIGHTS[source] || 1;

  // Recency boost
  const hoursAgo = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  let recencyBoost = 0;
  if (hoursAgo < 24) recencyBoost = 2;
  else if (hoursAgo < 72) recencyBoost = 1;

  const total = keywordScore + authorWeight + recencyBoost;

  return {
    keyword_score: keywordScore,
    author_weight: authorWeight,
    recency_boost: recencyBoost,
    total,
    matched_keywords: matchedKeywords,
  };
}

function getCurrentISOWeek(): string {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
  return `${now.getFullYear()}-${String(weekNum).padStart(2, '0')}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { week } = await req.json().catch(() => ({}));
    const targetWeek = week || getCurrentISOWeek();

    console.log(`Scoring items for week ${targetWeek}...`);

    // Get items from the last 7 days that haven't been scored for this week
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: rawItems, error: fetchError } = await supabase
      .from('raw_items')
      .select('*')
      .gte('published_at', sevenDaysAgo)
      .order('published_at', { ascending: false });

    if (fetchError) throw fetchError;

    console.log(`Found ${rawItems?.length || 0} items to score`);

    // Check which items already have rankings for this week
    const { data: existingRankings } = await supabase
      .from('ranked_items')
      .select('raw_item_id')
      .eq('week', targetWeek);

    const existingIds = new Set(existingRankings?.map(r => r.raw_item_id) || []);

    // Score and insert
    const rankedItems = [];
    for (const item of rawItems || []) {
      if (existingIds.has(item.id)) continue;

      const scoreFactors = scoreContent(item.title, item.summary, item.source, item.published_at);
      
      rankedItems.push({
        raw_item_id: item.id,
        score: scoreFactors.total,
        score_factors: scoreFactors,
        week: targetWeek,
      });
    }

    if (rankedItems.length > 0) {
      const { error: insertError } = await supabase
        .from('ranked_items')
        .insert(rankedItems);

      if (insertError) throw insertError;
    }

    console.log(`Scored ${rankedItems.length} items for week ${targetWeek}`);

    // Check if we have enough content
    const { data: weekItems } = await supabase
      .from('ranked_items')
      .select('*')
      .eq('week', targetWeek)
      .gte('score', 3);

    const lowContentWarning = (weekItems?.length || 0) < 4;

    return new Response(
      JSON.stringify({
        success: true,
        week: targetWeek,
        scored: rankedItems.length,
        total_for_week: weekItems?.length || 0,
        low_content_warning: lowContentWarning,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scoring error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
