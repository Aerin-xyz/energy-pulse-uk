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

// Make webhook helper
async function sendToMakeWebhook(payload: LinkedInPostPayload, webhookUrl: string) {
  console.log('Sending to Make webhook:', webhookUrl);
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Webhook call failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('Webhook response:', result);
  return result;
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

    // Check webhook configuration
    const webhookUrl = Deno.env.get('MAKE_LINKEDIN_WEBHOOK_URL');

    if (!webhookUrl) {
      const errorMsg = 'LinkedIn webhook not configured';
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

    console.log('Using webhook transport');

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

    // Send via webhook
    try {
      const makeData = await sendToMakeWebhook(payload, webhookUrl);

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
          provider: 'make_webhook',
          response_data: makeData,
        });

      return new Response(
        JSON.stringify({ 
          message: mode === 'now' ? 'Post sent successfully' : 'Post scheduled successfully',
          linkedin_post_id: makeData.linkedin_post_id || makeData.post_id,
          transport: 'webhook'
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
          provider: 'make_webhook',
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
