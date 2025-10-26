import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const baseUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1`;
    const results = [];
    
    console.log('[cache-warmup] Starting cache warmup cycle...');
    
    // Warm each cache type sequentially to avoid overwhelming the system
    for (const updateType of ['high', 'mid', 'full']) {
      try {
        const startTime = Date.now();
        const response = await fetch(`${baseUrl}/energy-data?updateType=${updateType}`, {
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
          }
        });
        
        const duration = Date.now() - startTime;
        const responseData = await response.json();
        
        results.push({
          updateType,
          status: response.status,
          duration: `${duration}ms`,
          cacheHit: responseData._cacheHit || false,
          cacheTTL: responseData._cacheTTL || 0
        });
        
        console.log(`[cache-warmup] ${updateType}: ${response.status} (${duration}ms, cached: ${responseData._cacheHit || false})`);
      } catch (err) {
        results.push({
          updateType,
          error: err instanceof Error ? err.message : String(err)
        });
        console.error(`[cache-warmup] ${updateType} failed:`, err);
      }
      
      // Small delay between requests to be gentle on the system
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Cleanup expired cache entries
    let cleanupResult: any = { skipped: 'Not implemented yet' };
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const { data, error } = await supabase.rpc('cleanup_expired_cache');
      
      if (error) {
        cleanupResult = { error: error.message };
        console.error('[cache-warmup] Cleanup failed:', error);
      } else {
        cleanupResult = { success: true };
        console.log('[cache-warmup] Cleanup completed successfully');
      }
    } catch (err) {
      cleanupResult = { error: err instanceof Error ? err.message : String(err) };
      console.error('[cache-warmup] Cleanup error:', err);
    }
    
    const response = {
      timestamp: new Date().toISOString(),
      warmup: results,
      cleanup: cleanupResult
    };
    
    console.log('[cache-warmup] Cycle complete:', JSON.stringify(response, null, 2));
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[cache-warmup] Unexpected error:', err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : String(err)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
