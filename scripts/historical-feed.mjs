const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dmpncHV5dGV6b21kbHNheWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjYwMDQsImV4cCI6MjA3MjE0MjAwNH0.cEnOyHqSeamIXVX4N3-nkuXerqLsEsSsRD1Iy3mo15o';

export const fetchHistoricalGeneration = async (period = '7d') => {
  const response = await fetch(`https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/historical-generation?period=${period}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`historical-generation failed ${response.status}: ${await response.text()}`);
  }

  return response.json();
};
