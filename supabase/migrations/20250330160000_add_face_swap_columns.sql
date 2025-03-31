-- Add columns for face swap functionality
ALTER TABLE public.creation_history
ADD COLUMN IF NOT EXISTS face_swap_input_image TEXT,
ADD COLUMN IF NOT EXISTS face_swap_prediction_id TEXT,
ADD COLUMN IF NOT EXISTS face_swap_media_url TEXT,
ADD COLUMN IF NOT EXISTS face_swap_original_url TEXT;

-- Update comments
COMMENT ON COLUMN public.creation_history.face_swap_input_image IS 'URL to user uploaded face image for face swapping';
COMMENT ON COLUMN public.creation_history.face_swap_prediction_id IS 'Replicate prediction ID for face swap operation';
COMMENT ON COLUMN public.creation_history.face_swap_media_url IS 'URL to face swapped result stored in Supabase';
COMMENT ON COLUMN public.creation_history.face_swap_original_url IS 'Original face swap result URL from Replicate';