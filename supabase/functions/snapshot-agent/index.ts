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

interface DailyMetrics {
  date: string;
  wind: number;
  gas: number;
  solar: number;
  ci: number;
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

    console.log(`Computing snapshot for week ${targetWeek}...`);

    // Check if snapshot already exists
    const { data: existing } = await supabase
      .from('snapshot_metrics')
      .select('*')
      .eq('week', targetWeek)
      .single();

    if (existing) {
      console.log('Snapshot already exists for this week');
      return new Response(
        JSON.stringify({ success: true, snapshot: existing, created: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get last 7 days of energy data
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: historyData, error: historyError } = await supabase
      .from('energy_data_history')
      .select('payload, as_of')
      .gte('as_of', sevenDaysAgo)
      .order('as_of', { ascending: true });

    if (historyError) throw historyError;

    if (!historyData || historyData.length === 0) {
      throw new Error('No energy data available for the past week');
    }

    // Aggregate daily metrics
    const dailyMetrics: DailyMetrics[] = [];
    const dataByDay: Record<string, any[]> = {};

    for (const record of historyData) {
      const date = record.as_of.split('T')[0];
      if (!dataByDay[date]) dataByDay[date] = [];
      dataByDay[date].push(record.payload);
    }

    for (const [date, payloads] of Object.entries(dataByDay)) {
      const avgWind = payloads.reduce((sum, p) => sum + (p.mix?.wind || 0), 0) / payloads.length;
      const avgGas = payloads.reduce((sum, p) => sum + (p.mix?.gas || 0), 0) / payloads.length;
      const avgSolar = payloads.reduce((sum, p) => sum + (p.mix?.solar || 0), 0) / payloads.length;
      const avgCi = payloads.reduce((sum, p) => sum + (p.carbon_intensity || 0), 0) / payloads.length;

      dailyMetrics.push({ date, wind: avgWind, gas: avgGas, solar: avgSolar, ci: avgCi });
    }

    // Calculate weekly averages
    const avgWind = dailyMetrics.reduce((sum, d) => sum + d.wind, 0) / dailyMetrics.length;
    const avgGas = dailyMetrics.reduce((sum, d) => sum + d.gas, 0) / dailyMetrics.length;
    const avgSolar = dailyMetrics.reduce((sum, d) => sum + d.solar, 0) / dailyMetrics.length;
    const avgCi = dailyMetrics.reduce((sum, d) => sum + d.ci, 0) / dailyMetrics.length;

    // Determine biggest swing
    const windMax = Math.max(...dailyMetrics.map(d => d.wind));
    const windMin = Math.min(...dailyMetrics.map(d => d.wind));
    const gasMax = Math.max(...dailyMetrics.map(d => d.gas));
    const gasMin = Math.min(...dailyMetrics.map(d => d.gas));

    const windSwing = windMax - windMin;
    const gasSwing = gasMax - gasMin;

    let biggestSwing = 'Stable generation across the week';
    if (windSwing > gasSwing && windSwing > 2000) {
      biggestSwing = `Wind generation swung ${(windSwing / 1000).toFixed(1)} GW this week`;
    } else if (gasSwing > 2000) {
      biggestSwing = `Gas generation varied by ${(gasSwing / 1000).toFixed(1)} GW`;
    }

    // Chart URL placeholder (would generate actual PNG in production)
    const chartUrl = `/email/snapshot-${targetWeek}.png`;

    // Insert snapshot
    const { data: snapshot, error: insertError } = await supabase
      .from('snapshot_metrics')
      .insert({
        week: targetWeek,
        avg_wind: avgWind,
        avg_gas: avgGas,
        avg_solar: avgSolar,
        avg_ci: avgCi,
        biggest_swing: biggestSwing,
        chart_url: chartUrl,
        metrics_data: { daily: dailyMetrics },
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`Snapshot created for week ${targetWeek}`);

    return new Response(
      JSON.stringify({ success: true, snapshot, created: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Snapshot error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
