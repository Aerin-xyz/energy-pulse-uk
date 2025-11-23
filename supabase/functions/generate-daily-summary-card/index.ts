import { createClient } from 'npm:@supabase/supabase-js@2';
import satori from 'npm:satori@0.10.14';
import { Resvg, initWasm } from 'npm:@resvg/resvg-wasm';
import { SatoriDailySummaryCard } from '../_shared/SatoriDailySummaryCard.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  date?: string; // YYYY-MM-DD format
}

// Fuel type color mapping using design system colors
const FUEL_COLORS: Record<string, string> = {
  'Wind': 'hsl(168, 42%, 59%)',
  'Solar': 'hsl(40, 92%, 58%)',
  'Gas': 'hsl(6, 87%, 59%)',
  'Nuclear': 'hsl(260, 54%, 74%)',
  'Imports': 'hsl(0, 0%, 84%)',
  'Biomass': 'hsl(150, 40%, 70%)',
  'Hydro': 'hsl(212, 28%, 53%)',
  'Coal': 'hsl(35, 22%, 82%)',
  'Other': 'hsl(220, 20%, 50%)',
};

// Base64 encoded Energy Mix logo (placeholder - will be loaded from actual asset)
const LOGO_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function fetchHistoricalData(supabase: any, targetDate: string) {
  console.log(`[generate-daily-summary-card] Fetching historical data for ${targetDate}`);
  
  const { data: response, error } = await supabase.functions.invoke(
    'historical-generation',
    {
      body: { 
        period: '24h',
        date: targetDate
      }
    }
  );

  if (error) throw new Error(`Failed to fetch historical data: ${error.message}`);
  if (response.error) throw new Error(`Historical data error: ${response.error}`);

  const historicalData = response.data || [];
  
  if (historicalData.length === 0) {
    throw new Error('No data available for this date');
  }

  return historicalData;
}

function processHistoricalData(historicalData: any[]) {
  console.log(`[generate-daily-summary-card] Processing ${historicalData.length} data points`);
  
  // Calculate daily averages
  const fuelTotals: Record<string, { mw: number; count: number }> = {};
  let totalMW = 0;

  historicalData.forEach((period: any) => {
    totalMW += period.totalMW || 0;
    
    // Aggregate fuel mix
    period.fuelMix?.forEach((fuel: any) => {
      if (!fuelTotals[fuel.fuelType]) {
        fuelTotals[fuel.fuelType] = { mw: 0, count: 0 };
      }
      fuelTotals[fuel.fuelType].mw += fuel.mw || 0;
      fuelTotals[fuel.fuelType].count += 1;
    });
  });

  // Calculate percentages and create mix breakdown
  const avgTotalMW = totalMW / historicalData.length;
  const mixBreakdown = Object.entries(fuelTotals).map(([fuelType, data]) => {
    const avgMW = data.mw / data.count;
    const percentage = (avgMW / avgTotalMW) * 100;
    return {
      fuelType,
      percentage,
      color: FUEL_COLORS[fuelType] || FUEL_COLORS['Other'],
    };
  });

  // Calculate low carbon % (everything except Gas and Coal)
  const lowCarbonFuels = ['Wind', 'Solar', 'Nuclear', 'Hydro', 'Biomass'];
  const lowCarbonPercent = mixBreakdown
    .filter(item => lowCarbonFuels.includes(item.fuelType))
    .reduce((sum, item) => sum + item.percentage, 0);

  // Calculate renewables % (Wind, Solar, Hydro, Biomass)
  const renewableFuels = ['Wind', 'Solar', 'Hydro', 'Biomass'];
  const renewablesPercent = mixBreakdown
    .filter(item => renewableFuels.includes(item.fuelType))
    .reduce((sum, item) => sum + item.percentage, 0);

  // Estimate carbon intensity (simplified calculation)
  const emissionFactors: Record<string, number> = {
    'Gas': 400,
    'Coal': 900,
    'Biomass': 120,
    'Wind': 0,
    'Solar': 0,
    'Nuclear': 0,
    'Hydro': 0,
    'Imports': 200,
    'Other': 300,
  };
  
  const carbonIntensity = Math.round(
    mixBreakdown.reduce((sum, item) => {
      const factor = emissionFactors[item.fuelType] || 200;
      return sum + (factor * item.percentage / 100);
    }, 0)
  );

  return {
    carbonIntensity,
    lowCarbonPercent,
    renewablesPercent,
    mixBreakdown,
  };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Initialize WASM once when the function starts
let wasmInitialized = false;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[generate-daily-summary-card] Starting function');

    // Initialize WASM module if not already done
    if (!wasmInitialized) {
      console.log('[generate-daily-summary-card] Initializing WASM module...');
      await initWasm(fetch('https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm'));
      wasmInitialized = true;
      console.log('[generate-daily-summary-card] WASM module initialized');
    }

    // Get Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Fetch and process historical data
    const historicalData = await fetchHistoricalData(supabase, targetDate);
    const { carbonIntensity, lowCarbonPercent, renewablesPercent, mixBreakdown } = 
      processHistoricalData(historicalData);

    const dateLabel = formatDate(targetDate);

    console.log('[generate-daily-summary-card] Rendering card with Satori...');
    console.log(`[generate-daily-summary-card] Data: CI=${carbonIntensity}, LC=${lowCarbonPercent.toFixed(1)}%, RE=${renewablesPercent.toFixed(1)}%`);

    // Render card to SVG using Satori (2x resolution for retina displays)
    const svg = await satori(
      SatoriDailySummaryCard({
        dateLabel,
        carbonIntensity,
        lowCarbonPercent,
        renewablesPercent,
        mixBreakdown,
        logoDataUrl: LOGO_DATA_URL,
      }),
      {
        width: 2400,
        height: 1260,
        fonts: [
          {
            name: 'Inter',
            data: await fetch('https://og-playground.vercel.app/inter-latin-ext-400-normal.woff').then(res => res.arrayBuffer()),
            weight: 400,
            style: 'normal',
          },
          {
            name: 'Inter',
            data: await fetch('https://og-playground.vercel.app/inter-latin-ext-600-normal.woff').then(res => res.arrayBuffer()),
            weight: 600,
            style: 'normal',
          },
          {
            name: 'Inter',
            data: await fetch('https://og-playground.vercel.app/inter-latin-ext-700-normal.woff').then(res => res.arrayBuffer()),
            weight: 700,
            style: 'normal',
          },
        ],
      }
    );

    console.log(`[generate-daily-summary-card] SVG generated: ${svg.length} bytes`);

    // Convert SVG to PNG using Resvg (high resolution)
    console.log('[generate-daily-summary-card] Converting SVG to PNG with Resvg...');
    const resvg = new Resvg(svg, {
      fitTo: {
        mode: 'width',
        value: 2400,
      },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    console.log(`[generate-daily-summary-card] PNG generated: ${pngBuffer.length} bytes`);

    // Upload to Supabase Storage (2x resolution for LinkedIn)
    const fileName = `daily-summary-${targetDate}-2x.png`;
    const { error: uploadError } = await supabase.storage
      .from('social_cards')
      .upload(fileName, pngBuffer, {
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
      .eq('post_type', 'summary')
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
          post_type: 'summary',
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
