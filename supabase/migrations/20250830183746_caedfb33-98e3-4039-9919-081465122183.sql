-- Drop and recreate view without security definer to fix security warning
DROP VIEW IF EXISTS energy_data_latest;

CREATE OR REPLACE VIEW energy_data_latest AS
  SELECT payload FROM energy_data_history ORDER BY as_of DESC LIMIT 1;