import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateSummary(title: string, content: string | null, source: string): Promise<string> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!lovableApiKey) {
    // Fallback: use first 160 chars
    const text = content || title;
    return text.substring(0, 160).trim() + (text.length > 160 ? '...' : '');
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a concise energy news summarizer. Create one-line summaries (max 26 words) that capture the key point and attribute the source.',
          },
          {
            role: 'user',
            content: `Summarize this news item in max 26 words. Include source attribution.\n\nSource: ${source}\nTitle: ${title}\nContent: ${content || 'N/A'}`,
          },
        ],
        max_tokens: 80,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || title.substring(0, 160);
  } catch (error) {
    console.error('Summary generation error:', error);
    const text = content || title;
    return text.substring(0, 160).trim() + (text.length > 160 ? '...' : '');
  }
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

    console.log(`Generating summaries for week ${targetWeek}...`);

    // Get top ranked items that don't have summaries yet
    const { data: rankedItems, error: fetchError } = await supabase
      .from('ranked_items')
      .select(`
        *,
        raw_items:raw_item_id (*)
      `)
      .eq('week', targetWeek)
      .gte('score', 3)
      .order('score', { ascending: false })
      .limit(20);

    if (fetchError) throw fetchError;

    console.log(`Found ${rankedItems?.length || 0} ranked items`);

    // Check which already have summaries
    const rankedIds = rankedItems?.map(r => r.id) || [];
    const { data: existingSummaries } = await supabase
      .from('summaries')
      .select('ranked_item_id')
      .in('ranked_item_id', rankedIds);

    const existingSet = new Set(existingSummaries?.map(s => s.ranked_item_id) || []);

    // Generate summaries
    const summaries = [];
    for (const rankedItem of rankedItems || []) {
      if (existingSet.has(rankedItem.id)) continue;

      const rawItem = rankedItem.raw_items;
      if (!rawItem) continue;

      console.log(`Generating summary for: ${rawItem.title}`);
      
      const summaryText = await generateSummary(rawItem.title, rawItem.summary, rawItem.source);
      const wordCount = summaryText.split(/\s+/).length;

      summaries.push({
        ranked_item_id: rankedItem.id,
        summary_text: summaryText,
        word_count: wordCount,
        model_used: Deno.env.get('LOVABLE_API_KEY') ? 'google/gemini-2.5-flash' : 'fallback',
      });

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (summaries.length > 0) {
      const { error: insertError } = await supabase
        .from('summaries')
        .insert(summaries);

      if (insertError) throw insertError;
    }

    console.log(`Generated ${summaries.length} summaries for week ${targetWeek}`);

    return new Response(
      JSON.stringify({
        success: true,
        week: targetWeek,
        generated: summaries.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Summarizer error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
