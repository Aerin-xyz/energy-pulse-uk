import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendTestEmail() {
  const apiKey = Deno.env.get('MAILERLITE_API_KEY');
  
  if (!apiKey) {
    throw new Error('MAILERLITE_API_KEY not configured');
  }

  const campaignData = {
    name: `MailerLite API Test - ${new Date().toISOString()}`,
    type: "regular",
    emails: [
      {
        subject: "Energy Mix - MailerLite API Test",
        from_name: "Energy Mix",
        from: "hello@energymix.info",
        content: `
          <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h1 style="color: #2563eb;">MailerLite API Test</h1>
              <p>This is a test email from the Energy Mix Weekly Digest system.</p>
              <p>If you're seeing this, the MailerLite API integration is working correctly!</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Test sent at: ${new Date().toLocaleString()}
              </p>
            </body>
          </html>
        `,
      },
    ],
    groups: [], // Empty groups means it won't send to anyone - just creates the campaign
  };

  console.log('Sending test campaign to MailerLite...');
  
  const response = await fetch('https://connect.mailerlite.com/api/campaigns', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify(campaignData),
  });

  const responseText = await response.text();
  console.log('MailerLite response status:', response.status);
  console.log('MailerLite response:', responseText);

  if (!response.ok) {
    throw new Error(`MailerLite API error (${response.status}): ${responseText}`);
  }

  const result = JSON.parse(responseText);
  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting MailerLite API test...');
    
    const result = await sendTestEmail();
    
    console.log('MailerLite API test successful!');
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'MailerLite API test successful! Campaign created (not sent to subscribers).',
        campaign: result.data,
        instructions: [
          '1. Check your MailerLite dashboard: https://dashboard.mailerlite.com/campaigns',
          '2. You should see a new draft campaign created',
          '3. The campaign was NOT sent to subscribers - it\'s just a draft for testing',
          '4. Verify the sender domain (energymix.info) and email (hello@energymix.info) are configured',
        ]
      }), 
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('MailerLite API test failed:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        troubleshooting: [
          'Check that MAILERLITE_API_KEY is configured correctly',
          'Verify your MailerLite account is active',
          'Ensure sender domain (energymix.info) is verified in MailerLite',
          'Check the sender email (hello@energymix.info) is configured',
          'Review the detailed error message above',
        ]
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
