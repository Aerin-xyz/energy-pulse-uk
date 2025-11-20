import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApprovalRequest {
  postId: string;
  mode: 'now' | 'schedule';
}

interface LinkedInPostPayload {
  post_id: string;
  channel: 'linkedin';
  post_type: string;
  text: string;
  image_path: string | null;
  schedule_time: string | null;
  mode: 'now' | 'schedule';
}

// Make API helper
async function runMakeLinkedInScenarioViaApi(payload: LinkedInPostPayload) {
  const baseUrl = Deno.env.get('MAKE_API_BASE_URL');
  const token = Deno.env.get('MAKE_API_TOKEN');
  const scenarioId = Deno.env.get('MAKE_SCENARIO_ID_LINKEDIN_PUBLISHER');

  if (!baseUrl || !token || !scenarioId) {
    throw new Error('Make API not configured');
  }

  const url = `${baseUrl.replace(/\/$/, '')}/scenarios/${scenarioId}/run`;
  console.log('Making API call to:', url);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: payload,
      responsive: false
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Make API call failed (${res.status}): ${text}`);
  }

  let json: any = null;
  try { 
    json = await res.json(); 
    console.log('Make API response:', json);
  } catch {}

  return json;
}

// Webhook fallback helper
async function sendToMakeWebhook(payload: LinkedInPostPayload) {
  const url = Deno.env.get('MAKE_LINKEDIN_WEBHOOK_URL');
  if (!url) throw new Error('Webhook URL missing');

  console.log('Sending to webhook:', url);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Make webhook call failed (${res.status}): ${text}`);
  }

  let json: any = null;
  try { 
    json = await res.json(); 
    console.log('Webhook response:', json);
  } catch {}
  
  return json;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { postId, mode }: ApprovalRequest = await req.json();
    console.log(`Approving post ${postId} with mode: ${mode}`);

    // Fetch the post
    const { data: post, error: fetchError } = await supabaseClient
      .from('social_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      console.error('Post not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Post not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Validate post
    if (post.platform !== 'linkedin') {
      return new Response(
        JSON.stringify({ error: 'Only LinkedIn posts are supported' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!['draft', 'approved', 'failed'].includes(post.status)) {
      return new Response(
        JSON.stringify({ error: 'Post cannot be approved from current status' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Determine transport method
    const hasApi = !!Deno.env.get('MAKE_API_TOKEN') &&
                   !!Deno.env.get('MAKE_API_BASE_URL') &&
                   !!Deno.env.get('MAKE_SCENARIO_ID_LINKEDIN_PUBLISHER');

    const hasWebhook = !!Deno.env.get('MAKE_LINKEDIN_WEBHOOK_URL');

    let transport: 'api' | 'webhook' | null = null;
    if (hasApi) transport = 'api';
    else if (hasWebhook) transport = 'webhook';

    if (!transport) {
      const errorMsg = 'No Make transport available (need API credentials or webhook URL)';
      console.error(errorMsg);
      
      await supabaseClient
        .from('social_posts')
        .update({ 
          status: 'failed',
          error_message: errorMsg 
        })
        .eq('id', postId);

      return new Response(
        JSON.stringify({ error: errorMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`Using transport: ${transport}`);

    // Update status to approved
    await supabaseClient
      .from('social_posts')
      .update({ status: 'approved' })
      .eq('id', postId);

    // Prepare payload
    let scheduleTime = null;
    if (mode === 'schedule') {
      if (post.scheduled_for) {
        scheduleTime = post.scheduled_for;
      } else {
        // Default to 10 minutes from now
        const futureTime = new Date();
        futureTime.setMinutes(futureTime.getMinutes() + 10);
        scheduleTime = futureTime.toISOString();
      }
    }

    const payload: LinkedInPostPayload = {
      post_id: post.id,
      channel: 'linkedin',
      post_type: post.post_type,
      text: post.content,
      image_path: post.image_path,
      schedule_time: scheduleTime,
      mode: mode,
    };

    console.log('Sending payload:', payload);

    // Send using selected transport
    try {
      let makeData: any = {};
      let executionId: string | null = null;

      if (transport === 'api') {
        const apiResponse = await runMakeLinkedInScenarioViaApi(payload);
        makeData = apiResponse;
        executionId = apiResponse?.executionId || null;
      } else {
        const webhookResponse = await sendToMakeWebhook(payload);
        makeData = webhookResponse;
      }

      // Update post as sent
      await supabaseClient
        .from('social_posts')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          linkedin_post_id: makeData.linkedin_post_id || makeData.post_id || null,
          error_message: null,
        })
        .eq('id', postId);

      // Log success to send_logs
      await supabaseClient
        .from('send_logs')
        .insert({
          entity_id: postId,
          entity_type: 'social_post',
          status: 'success',
          provider: transport === 'api' ? 'make_api' : 'make_webhook',
          response_data: makeData,
        });

      return new Response(
        JSON.stringify({ 
          message: mode === 'now' ? 'Post sent successfully' : 'Post scheduled successfully',
          linkedin_post_id: makeData.linkedin_post_id || makeData.post_id,
          transport: transport,
          execution_id: executionId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } catch (sendError: any) {
      console.error('Send error:', sendError);
      const errorMessage = sendError.message || 'Failed to send via Make';

      // Update post as failed
      await supabaseClient
        .from('social_posts')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', postId);

      // Log failure
      await supabaseClient
        .from('send_logs')
        .insert({
          entity_id: postId,
          entity_type: 'social_post',
          status: 'failed',
          provider: transport === 'api' ? 'make_api' : 'make_webhook',
          error_message: errorMessage,
        });

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error in approve-social-post:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
