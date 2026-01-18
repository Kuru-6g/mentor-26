-- Add profile_completed column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Optional: Update existing profiles to be 'completed' if they have data
UPDATE public.profiles
SET profile_completed = TRUE
WHERE full_name IS NOT NULL AND role IS NOT NULL;
