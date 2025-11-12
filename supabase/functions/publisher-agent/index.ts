import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function publishToMailerLite(subject: string, htmlContent: string): Promise<any> {
  const apiKey = Deno.env.get('MAILERLITE_API_KEY');
  if (!apiKey) {
    console.log('MAILERLITE_API_KEY not configured - skipping email send');
    return { success: false, error: 'API key not configured' };
  }

  try {
    const response = await fetch('https://connect.mailerlite.com/api/campaigns', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: subject,
        type: 'regular',
        emails: [{
          subject,
          from_name: 'Energy Mix',
          from: 'hello@energymix.info',
          content: htmlContent,
        }],
      }),
    });

    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function publishToLinkedIn(content: string, webhookUrl: string): Promise<any> {
  if (!webhookUrl) {
    console.log('LINKEDIN_WEBHOOK_URL not configured - skipping post');
    return { success: false, error: 'Webhook not configured' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    return { success: response.ok, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { issue_id } = await req.json();
    if (!issue_id) {
      throw new Error('issue_id is required');
    }

    console.log(`Publishing newsletter ${issue_id}...`);

    // Get newsletter
    const { data: newsletter, error: newsletterError } = await supabase
      .from('newsletter_issues')
      .select('*')
      .eq('id', issue_id)
      .single();

    if (newsletterError || !newsletter) {
      throw new Error('Newsletter not found');
    }

    if (newsletter.status !== 'approved') {
      throw new Error('Newsletter must be approved before publishing');
    }

    // Publish newsletter via MailerLite
    const emailResult = await publishToMailerLite(newsletter.subject, newsletter.html_content);
    
    await supabase.from('send_logs').insert({
      entity_type: 'newsletter',
      entity_id: issue_id,
      status: emailResult.success ? 'success' : 'failed',
      provider: 'mailerlite',
      response_data: emailResult,
      error_message: emailResult.error || null,
    });

    // Get social posts
    const { data: socialPosts } = await supabase
      .from('social_posts')
      .select('*')
      .eq('newsletter_id', issue_id)
      .eq('status', 'approved');

    const linkedInWebhook = Deno.env.get('LINKEDIN_WEBHOOK_URL');
    const socialResults = [];

    for (const post of socialPosts || []) {
      const result = await publishToLinkedIn(post.content, linkedInWebhook!);
      
      await supabase.from('send_logs').insert({
        entity_type: 'social_post',
        entity_id: post.id,
        status: result.success ? 'success' : 'failed',
        provider: 'linkedin_webhook',
        response_data: result,
        error_message: result.error || null,
      });

      if (result.success) {
        await supabase
          .from('social_posts')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', post.id);
      }

      socialResults.push({ post_id: post.id, success: result.success });
    }

    // Update newsletter status
    if (emailResult.success) {
      await supabase
        .from('newsletter_issues')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', issue_id);
    }

    console.log(`Publishing complete for ${issue_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        newsletter_sent: emailResult.success,
        social_posts_sent: socialResults.filter(r => r.success).length,
        social_posts_total: socialResults.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Publisher error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
