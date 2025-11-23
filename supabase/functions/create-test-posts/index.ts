import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get week from request body or use current week
    const { week } = await req.json().catch(() => ({}));
    const targetWeek = week || (() => {
      const now = new Date();
      const year = now.getFullYear();
      const weekNum = Math.ceil(((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7);
      return `${year}-W${weekNum.toString().padStart(2, '0')}`;
    })();

    const testPosts = [
      {
        week: targetWeek,
        platform: 'linkedin',
        post_type: 'summary',
        content: `📊 This week in UK energy:

Wind power leads at 44% of generation
Strong renewable performance with solar contributing 8%
Import flows remain steady at 21%

Average carbon intensity tracking lower than seasonal norms

Read the full digest: [link]

#UKEnergy #Renewables #EnergyTransition #WindPower`,
        status: 'draft',
      },
      {
        week: targetWeek,
        platform: 'linkedin',
        post_type: 'chart',
        content: `📈 Weekly generation snapshot (Week 48):

🌬️ Wind: 16.9 GW (44%)
☀️ Solar: 3.1 GW (8%)
⚡ Gas: 2.6 GW (7%)
⚛️ Nuclear: 4.1 GW (11%)
🔌 Imports: 8.1 GW (21%)

Wind dominates UK power generation this week!

[Chart visualization would be attached]

#EnergyData #UKPower #CleanEnergy`,
        status: 'draft',
      },
      {
        week: targetWeek,
        platform: 'linkedin',
        post_type: 'outlook',
        content: `Looking ahead at the UK energy system...

🔮 Week 48 insights:
• Wind capacity delivering strong performance
• Gas generation at 7-year seasonal lows
• Interconnector flows from EU remain robust
• Solar generation exceeding forecasts despite winter conditions

The energy transition continues to accelerate. Full technical analysis in this week's Energy Mix Weekly digest.

#EnergyPolicy #NetZero #EnergyAnalysis`,
        status: 'draft',
      },
    ];

    const { data, error } = await supabase
      .from('social_posts')
      .insert(testPosts)
      .select();

    if (error) {
      console.error('Error inserting test posts:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully created test posts:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        posts: data,
        message: `Created ${data.length} test posts for week ${targetWeek}` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
