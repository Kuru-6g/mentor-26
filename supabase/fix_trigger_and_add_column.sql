-- 1. Fix the broken trigger function (replace public.now() with standard now())
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Add profile_completed column if it wasn't added yet
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- 3. Update existing profiles
UPDATE public.profiles
SET profile_completed = TRUE
WHERE full_name IS NOT NULL AND role IS NOT NULL;
