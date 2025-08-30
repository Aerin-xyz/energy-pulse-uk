-- Enable RLS on energy_data_history table
ALTER TABLE energy_data_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to insert/select (for edge function use)
CREATE POLICY "Allow service role full access" ON energy_data_history
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy to allow public read access to latest data only
CREATE POLICY "Allow public read access to latest data" ON energy_data_history
FOR SELECT 
TO anon, authenticated
USING (
  id = (
    SELECT id FROM energy_data_history 
    ORDER BY as_of DESC 
    LIMIT 1
  )
);