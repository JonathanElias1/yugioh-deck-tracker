-- Yu-Gi-Oh Deck Tracker - Supabase Setup
-- Run this in Supabase SQL Editor to set up tables

-- ============================================
-- STEP 1: Drop existing tables (if any)
-- ============================================
DROP TABLE IF EXISTS public.user_deck_progress CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- ============================================
-- STEP 2: Create user profiles table
-- ============================================
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: Create deck progress table
-- ============================================
CREATE TABLE public.user_deck_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    deck_id INTEGER NOT NULL,

    -- Store owned cards as JSONB: {"3 Blue-Eyes White Dragon": true, "2 Dark Magician": 1}
    owned_cards JSONB DEFAULT '{}'::jsonb,

    -- Store removed cards as JSONB array: ["Monster Reborn", "Pot of Greed"]
    removed_cards JSONB DEFAULT '[]'::jsonb,

    -- Store custom cards as JSONB: {"main": ["3 Custom Card"], "extra": ["1 Custom Extra"]}
    custom_cards JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one record per user per deck
    UNIQUE(user_id, deck_id)
);

-- ============================================
-- STEP 4: Create indexes for performance
-- ============================================
CREATE INDEX idx_user_deck_progress_user_id ON public.user_deck_progress(user_id);
CREATE INDEX idx_user_deck_progress_deck_id ON public.user_deck_progress(deck_id);

-- ============================================
-- STEP 5: Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_deck_progress ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: Create RLS Policies
-- ============================================

-- User Profiles: Users can only read/write their own profile
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

-- Deck Progress: Users can only read/write their own deck progress
CREATE POLICY "Users can view own deck progress"
    ON public.user_deck_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deck progress"
    ON public.user_deck_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deck progress"
    ON public.user_deck_progress FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own deck progress"
    ON public.user_deck_progress FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- STEP 7: Create function to auto-update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER set_updated_at_user_profiles
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_user_deck_progress
    BEFORE UPDATE ON public.user_deck_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- STEP 8: Create function to auto-create user profile
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- DONE! Your database is ready.
-- ============================================

-- Verify tables were created:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
