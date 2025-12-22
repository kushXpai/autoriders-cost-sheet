
-- Add city column to fuel_rates table
ALTER TABLE public.fuel_rates ADD COLUMN city text NOT NULL DEFAULT 'Mumbai';

-- Remove the default after adding
ALTER TABLE public.fuel_rates ALTER COLUMN city DROP DEFAULT;

-- Create index for faster lookups
CREATE INDEX idx_fuel_rates_city ON public.fuel_rates(city);
