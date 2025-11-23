const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check webhook-only configuration
    const hasWebhook = !!Deno.env.get('MAKE_LINKEDIN_WEBHOOK_URL');

    return new Response(
      JSON.stringify({ 
        configured: hasWebhook,
        transport: hasWebhook ? 'webhook' : null,
        hasWebhook
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error checking config:', error);
    return new Response(
      JSON.stringify({ configured: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
