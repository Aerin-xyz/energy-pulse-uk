import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApprovalRequest {
  postId: string;
  mode: 'now' | 'schedule';
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

    // Update status to approved
    await supabaseClient
      .from('social_posts')
      .update({ status: 'approved' })
      .eq('id', postId);

    // Prepare webhook payload
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

    const payload = {
      post_id: post.id,
      channel: post.platform,
      post_type: post.post_type,
      text: post.content,
      image_path: post.image_path,
      schedule_time: scheduleTime,
      mode: mode,
    };

    console.log('Sending payload to Make webhook:', payload);

    // Get webhook URL
    const webhookUrl = Deno.env.get('MAKE_LINKEDIN_WEBHOOK_URL');
    if (!webhookUrl) {
      const errorMsg = 'MAKE_LINKEDIN_WEBHOOK_URL not configured';
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

    // Call Make webhook
    try {
      const makeResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!makeResponse.ok) {
        throw new Error(`Make webhook returned ${makeResponse.status}`);
      }

      const makeData = await makeResponse.json().catch(() => ({}));
      console.log('Make webhook response:', makeData);

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
          provider: 'make_linkedin',
          response_data: makeData,
        });

      return new Response(
        JSON.stringify({ 
          message: mode === 'now' ? 'Post sent successfully' : 'Post scheduled successfully',
          linkedin_post_id: makeData.linkedin_post_id || makeData.post_id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } catch (webhookError: any) {
      console.error('Webhook error:', webhookError);
      const errorMessage = webhookError.message || 'Failed to send to Make webhook';

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
          provider: 'make_linkedin',
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
