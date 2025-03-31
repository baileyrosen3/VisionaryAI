-- Create creation_history table
CREATE TABLE IF NOT EXISTS public.creation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    media_url TEXT NOT NULL,
    original_url TEXT,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    original_prompt TEXT NOT NULL,
    enhanced_prompt TEXT,
    model_id TEXT,
    stored_in_supabase BOOLEAN DEFAULT false
);

-- Add RLS (Row Level Security)
ALTER TABLE public.creation_history ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own creations
CREATE POLICY "Users can view their own creations"
    ON public.creation_history
    FOR SELECT
    USING (auth.uid() = user_id);

-- Only allow users to insert their own creations
CREATE POLICY "Users can insert their own creations"
    ON public.creation_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS creation_history_user_id_idx ON public.creation_history (user_id);

-- Add comments for documentation
COMMENT ON TABLE public.creation_history IS 'Stores history of user creations (images and videos)';
COMMENT ON COLUMN public.creation_history.user_id IS 'The user who created this image/video';
COMMENT ON COLUMN public.creation_history.media_url IS 'URL to the generated media';
COMMENT ON COLUMN public.creation_history.original_url IS 'Original URL from the AI model before storage';
COMMENT ON COLUMN public.creation_history.media_type IS 'Type of media (image or video)';
COMMENT ON COLUMN public.creation_history.original_prompt IS 'The original prompt entered by the user';
COMMENT ON COLUMN public.creation_history.enhanced_prompt IS 'The AI-enhanced prompt used for generation';
COMMENT ON COLUMN public.creation_history.model_id IS 'The ID of the model used for generation';
COMMENT ON COLUMN public.creation_history.stored_in_supabase IS 'Whether the media is stored in Supabase storage'; 