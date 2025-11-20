const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if either API or webhook is configured
    const hasApi = !!Deno.env.get('MAKE_API_TOKEN') &&
                   !!Deno.env.get('MAKE_API_BASE_URL') &&
                   !!Deno.env.get('MAKE_SCENARIO_ID_LINKEDIN_PUBLISHER');

    const hasWebhook = !!Deno.env.get('MAKE_LINKEDIN_WEBHOOK_URL');

    const configured = hasApi || hasWebhook;
    const transport = hasApi ? 'api' : hasWebhook ? 'webhook' : null;

    return new Response(
      JSON.stringify({ 
        configured,
        transport,
        hasApi,
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
