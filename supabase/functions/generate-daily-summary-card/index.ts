import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  date?: string; // YYYY-MM-DD format
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[generate-daily-summary-card] Starting function');

    // Get Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get screenshot API credentials
    const screenshotApiUrl = Deno.env.get('SCREENSHOT_API_URL');
    const screenshotApiKey = Deno.env.get('SCREENSHOT_API_KEY');

    if (!screenshotApiUrl || !screenshotApiKey) {
      throw new Error(
        'Screenshot API not configured. Please set SCREENSHOT_API_URL and SCREENSHOT_API_KEY environment variables.'
      );
    }

    // Parse request body
    const body: RequestBody = req.method === 'POST' ? await req.json() : {};
    
    // Calculate target date (default: yesterday in Europe/London)
    let targetDate = body.date;
    if (!targetDate) {
      const now = new Date();
      const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
      londonTime.setDate(londonTime.getDate() - 1);
      targetDate = londonTime.toISOString().split('T')[0];
    }

    console.log(`[generate-daily-summary-card] Target date: ${targetDate}`);

    // Build the share page URL
    const sharePageUrl = `${supabaseUrl.replace('.supabase.co', '')}/share/daily-summary?date=${targetDate}`;
    console.log(`[generate-daily-summary-card] Share page URL: ${sharePageUrl}`);

    // Take screenshot using the API
    console.log('[generate-daily-summary-card] Requesting screenshot...');
    const screenshotResponse = await fetch(screenshotApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${screenshotApiKey}`,
      },
      body: JSON.stringify({
        url: sharePageUrl,
        viewport: {
          width: 1200,
          height: 630,
        },
        format: 'png',
        fullPage: false,
      }),
    });

    if (!screenshotResponse.ok) {
      const errorText = await screenshotResponse.text();
      throw new Error(`Screenshot API error: ${screenshotResponse.status} - ${errorText}`);
    }

    const screenshotBlob = await screenshotResponse.blob();
    console.log(`[generate-daily-summary-card] Screenshot received: ${screenshotBlob.size} bytes`);

    // Upload to Supabase Storage
    const fileName = `daily-summary-${targetDate}.png`;
    const { error: uploadError } = await supabase.storage
      .from('social_cards')
      .upload(fileName, screenshotBlob, {
        contentType: 'image/png',
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('social_cards')
      .getPublicUrl(fileName);

    console.log(`[generate-daily-summary-card] Image uploaded: ${publicUrl}`);

    // Check if a social_posts row already exists for this date and type
    const { data: existingPosts, error: queryError } = await supabase
      .from('social_posts')
      .select('id')
      .eq('post_type', 'daily_summary')
      .eq('summary_date', targetDate)
      .limit(1);

    if (queryError) {
      throw new Error(`Database query error: ${queryError.message}`);
    }

    let postId: string;

    if (existingPosts && existingPosts.length > 0) {
      // Update existing post
      postId = existingPosts[0].id;
      const { error: updateError } = await supabase
        .from('social_posts')
        .update({
          image_path: publicUrl,
          status: 'draft',
        })
        .eq('id', postId);

      if (updateError) {
        throw new Error(`Database update error: ${updateError.message}`);
      }

      console.log(`[generate-daily-summary-card] Updated existing post: ${postId}`);
    } else {
      // Insert new post
      const { data: newPost, error: insertError } = await supabase
        .from('social_posts')
        .insert({
          platform: 'linkedin',
          post_type: 'daily_summary',
          summary_date: targetDate,
          content: '', // To be filled later by agents/admin
          image_path: publicUrl,
          status: 'draft',
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Database insert error: ${insertError.message}`);
      }

      postId = newPost.id;
      console.log(`[generate-daily-summary-card] Created new post: ${postId}`);
    }

    // Return success response
    const response = {
      date: targetDate,
      image_url: publicUrl,
      post_id: postId,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[generate-daily-summary-card] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
