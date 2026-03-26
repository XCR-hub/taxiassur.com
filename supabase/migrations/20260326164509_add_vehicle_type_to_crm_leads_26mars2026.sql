/*
  # Add vehicle_type column to crm_leads

  1. Modified Tables
    - `crm_leads`
      - Added `vehicle_type` (text) - stores whether the lead is for a Taxi, VTC, or other vehicle type
      - Default value is empty string

  2. Notes
    - This column was referenced in the frontend but did not exist in the database
    - Common values: 'taxi', 'vtc', 'moto-taxi', etc.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'vehicle_type' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.crm_leads ADD COLUMN vehicle_type text DEFAULT '';
  END IF;
END $$;