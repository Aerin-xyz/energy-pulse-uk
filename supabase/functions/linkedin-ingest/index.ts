import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateContentHash(title: string, url: string): Promise<string> {
  const data = new TextEncoder().encode(title + url);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { items } = await req.json();
    
    if (!items || !Array.isArray(items)) {
      throw new Error('Invalid payload: items array required');
    }

    console.log(`Processing ${items.length} LinkedIn items...`);

    const processedItems = [];
    for (const item of items) {
      if (!item.title || !item.url || !item.source) {
        console.warn('Skipping invalid item:', item);
        continue;
      }

      const contentHash = await generateContentHash(item.title, item.url);
      
      processedItems.push({
        source: item.source,
        title: item.title,
        summary: item.summary || item.content || null,
        url: item.url,
        type: item.type || 'headline',
        published_at: item.published_at || new Date().toISOString(),
        raw_data: item,
        content_hash: contentHash,
      });
    }

    // Insert items (ignore duplicates)
    let insertedCount = 0;
    for (const item of processedItems) {
      const { error } = await supabase
        .from('raw_items')
        .insert(item)
        .select();
      
      if (!error) {
        insertedCount++;
      } else if (!error.message.includes('unique')) {
        console.error('Insert error:', error);
      }
    }

    console.log(`Ingested ${insertedCount} LinkedIn items`);

    return new Response(
      JSON.stringify({
        success: true,
        received: items.length,
        inserted: insertedCount,
        duplicates: items.length - insertedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('LinkedIn ingest error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
