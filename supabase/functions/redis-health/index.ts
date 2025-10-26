// Redis connection health check edge function
import { checkRateLimit, getCachedResponse, setCachedResponse } from '../_shared/security.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      environment: {
        hasRedisUrl: !!Deno.env.get('UPSTASH_REDIS_REST_URL'),
        hasRedisToken: !!Deno.env.get('UPSTASH_REDIS_REST_TOKEN'),
        urlFormat: Deno.env.get('UPSTASH_REDIS_REST_URL')?.startsWith('https://') || false,
      },
      tests: {}
    };

    // Test 1: Basic cache set/get
    console.log('[Redis Health] Testing cache operations...');
    try {
      const testKey = 'health-check-' + Date.now();
      const testData = JSON.stringify({ test: 'data', timestamp: Date.now() });
      
      await setCachedResponse(testKey, testData, 60);
      results.tests.cacheSet = { success: true };
      
      const cached = await getCachedResponse(testKey);
      results.tests.cacheGet = {
        success: cached.hit,
        dataMatches: cached.data === testData,
        ttl: cached.ttl
      };
    } catch (error) {
      results.tests.cache = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Test 2: Rate limiting
    console.log('[Redis Health] Testing rate limiting...');
    try {
      const rateLimit = await checkRateLimit('redis-health', '127.0.0.1', {
        requestsPerMinute: 10,
        requestsPerHour: 100
      });
      results.tests.rateLimit = {
        success: true,
        allowed: rateLimit.allowed,
        headers: rateLimit.headers
      };
    } catch (error) {
      results.tests.rateLimit = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Overall health status
    const allTestsPassed = Object.values(results.tests).every(
      (test: any) => test.success !== false
    );

    return new Response(
      JSON.stringify({
        healthy: allTestsPassed,
        ...results
      }, null, 2),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: allTestsPassed ? 200 : 500
      }
    );

  } catch (error) {
    console.error('[Redis Health] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }, null, 2),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500
      }
    );
  }
});
