import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getCurrentISOWeek(): string {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
  return `${now.getFullYear()}-${String(weekNum).padStart(2, '0')}`;
}

function assembleNewsletterHTML(snapshot: any, headlines: any[], papers: any[]): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Energy Mix Weekly</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #0066cc;">Energy Mix Weekly</h1>
  <p style="color: #666;">Week ${snapshot.week}</p>
  
  <h2>This Week's Snapshot</h2>
  <p><strong>${snapshot.biggest_swing}</strong></p>
  <ul>
    <li>Wind: ${(snapshot.avg_wind / 1000).toFixed(1)} GW average</li>
    <li>Gas: ${(snapshot.avg_gas / 1000).toFixed(1)} GW average</li>
    <li>Solar: ${(snapshot.avg_solar / 1000).toFixed(1)} GW average</li>
    <li>Carbon Intensity: ${snapshot.avg_ci.toFixed(0)} gCO₂/kWh</li>
  </ul>
  
  <h2>Top Stories</h2>
  ${headlines.map(h => `
    <div style="margin-bottom: 15px;">
      <a href="${h.url}" style="color: #0066cc; text-decoration: none; font-weight: bold;">${h.title}</a>
      <p style="margin: 5px 0 0 0; font-size: 14px;">${h.summary}</p>
    </div>
  `).join('')}
  
  ${papers.length > 0 ? `
    <h2>Research Papers</h2>
    ${papers.map(p => `
      <div style="margin-bottom: 15px;">
        <a href="${p.url}" style="color: #0066cc; text-decoration: none;">${p.title}</a>
        <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">${p.source}</p>
      </div>
    `).join('')}
  ` : ''}
  
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
  <p style="font-size: 12px; color: #999;">
    You're receiving this because you subscribed to Energy Mix Weekly.
    <a href="#" style="color: #999;">Unsubscribe</a>
  </p>
</body>
</html>
  `;
}

function assemblePlainText(snapshot: any, headlines: any[], papers: any[]): string {
  let text = `Energy Mix Weekly - Week ${snapshot.week}\n\n`;
  text += `THIS WEEK'S SNAPSHOT\n${snapshot.biggest_swing}\n\n`;
  text += `- Wind: ${(snapshot.avg_wind / 1000).toFixed(1)} GW average\n`;
  text += `- Gas: ${(snapshot.avg_gas / 1000).toFixed(1)} GW average\n`;
  text += `- Solar: ${(snapshot.avg_solar / 1000).toFixed(1)} GW average\n`;
  text += `- Carbon Intensity: ${snapshot.avg_ci.toFixed(0)} gCO₂/kWh\n\n`;
  
  text += `TOP STORIES\n\n`;
  headlines.forEach(h => {
    text += `${h.title}\n${h.summary}\n${h.url}\n\n`;
  });
  
  if (papers.length > 0) {
    text += `\nRESEARCH PAPERS\n\n`;
    papers.forEach(p => {
      text += `${p.title}\n${p.source}\n${p.url}\n\n`;
    });
  }
  
  return text;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { week } = await req.json().catch(() => ({}));
    const targetWeek = week || getCurrentISOWeek();

    console.log(`Assembling newsletter for week ${targetWeek}...`);

    // Get snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('snapshot_metrics')
      .select('*')
      .eq('week', targetWeek)
      .single();

    if (snapshotError || !snapshot) {
      throw new Error('Snapshot not found for this week. Run snapshot-agent first.');
    }

    // Get all ranked items for the week with their raw data
    const { data: allItems, error: itemsError } = await supabase
      .from('ranked_items')
      .select(`
        *,
        raw_items:raw_item_id (*),
        summaries (*)
      `)
      .eq('week', targetWeek)
      .eq('is_included', true)
      .order('score', { ascending: false });

    if (itemsError) throw itemsError;

    // Filter headlines and papers in JavaScript
    const headlines = allItems
      ?.filter(item => item.raw_items?.type === 'headline')
      .slice(0, 8) || [];

    const papers = allItems
      ?.filter(item => item.raw_items?.type === 'paper')
      .slice(0, 3) || [];

    // Format data (filter out any items where raw_items is null)
    const headlineData = headlines
      ?.filter(h => h.raw_items)
      .map(h => ({
        title: h.raw_items.title,
        summary: h.summaries?.[0]?.summary_text || h.raw_items.summary,
        url: h.raw_items.url,
        source: h.raw_items.source,
      })) || [];

    const paperData = papers
      ?.filter(p => p.raw_items)
      .map(p => ({
        title: p.raw_items.title,
        url: p.raw_items.url,
        source: p.raw_items.source,
      })) || [];

    // Assemble newsletter
    const htmlContent = assembleNewsletterHTML(snapshot, headlineData, paperData);
    const textContent = assemblePlainText(snapshot, headlineData, paperData);
    const subject = `Energy Mix Weekly: ${snapshot.biggest_swing}`;

    // Check if newsletter already exists for this week
    const { data: existingNewsletter } = await supabase
      .from('newsletter_issues')
      .select('id')
      .eq('week', targetWeek)
      .single();

    let newsletter;
    if (existingNewsletter) {
      // Update existing
      const { data, error: updateError } = await supabase
        .from('newsletter_issues')
        .update({
          subject,
          html_content: htmlContent,
          text_content: textContent,
          snapshot_id: snapshot.id,
        })
        .eq('week', targetWeek)
        .select()
        .single();
      if (updateError) throw updateError;
      newsletter = data;
    } else {
      // Insert new
      const { data, error: insertError } = await supabase
        .from('newsletter_issues')
        .insert({
          week: targetWeek,
          status: 'draft',
          subject,
          html_content: htmlContent,
          text_content: textContent,
          snapshot_id: snapshot.id,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      newsletter = data;
    }

    // Create social posts
    const socialPosts = [
      {
        newsletter_id: newsletter.id,
        platform: 'linkedin',
        post_type: 'summary',
        content: `📊 This week in UK energy:\n\n${snapshot.biggest_swing}\n\nAvg carbon intensity: ${snapshot.avg_ci.toFixed(0)} gCO₂/kWh\n\nRead the full digest: [link]\n\n#UKEnergy #Renewables #EnergyTransition`,
      },
      {
        newsletter_id: newsletter.id,
        platform: 'linkedin',
        post_type: 'chart',
        content: `📈 Weekly generation snapshot:\n\n🌬️ Wind: ${(snapshot.avg_wind / 1000).toFixed(1)} GW\n⚡ Gas: ${(snapshot.avg_gas / 1000).toFixed(1)} GW\n☀️ Solar: ${(snapshot.avg_solar / 1000).toFixed(1)} GW\n\n[Chart attached]\n\n#EnergyData #UKPower`,
      },
      {
        newsletter_id: newsletter.id,
        platform: 'linkedin',
        post_type: 'outlook',
        content: `Looking ahead at the UK energy system...\n\n${headlineData[0]?.summary || 'Key developments this week.'}\n\nFull analysis in the latest Energy Mix Weekly.\n\n#EnergyPolicy #NetZero`,
      },
    ];

    // Delete existing posts and insert new ones
    await supabase
      .from('social_posts')
      .delete()
      .eq('newsletter_id', newsletter.id);
    
    const { error: postsError } = await supabase
      .from('social_posts')
      .insert(socialPosts);

    if (postsError) throw postsError;

    console.log(`Newsletter and posts assembled for week ${targetWeek}`);

    return new Response(
      JSON.stringify({
        success: true,
        week: targetWeek,
        newsletter_id: newsletter.id,
        headlines_count: headlineData.length,
        papers_count: paperData.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Assembler error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
