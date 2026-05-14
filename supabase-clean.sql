-- Clean up ALL existing tables, functions, triggers, and policies
-- Run this FIRST in Supabase SQL Editor to start fresh

-- ============================================
-- STEP 1: Drop all existing tables
-- ============================================
DROP TABLE IF EXISTS public.card_progress CASCADE;
DROP TABLE IF EXISTS public.cards CASCADE;
DROP TABLE IF EXISTS public.deck_cards CASCADE;
DROP TABLE IF EXISTS public.decks CASCADE;
DROP TABLE IF EXISTS public.user_collection CASCADE;
DROP TABLE IF EXISTS public.user_deck_progress CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- ============================================
-- STEP 2: Drop all existing functions
-- ============================================
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- ============================================
-- STEP 3: Drop all existing triggers (CASCADE already handled this)
-- ============================================
-- Triggers are automatically dropped with CASCADE above

-- ============================================
-- DONE! Database is now clean.
-- ============================================

-- Verify everything was deleted:
SELECT 'Tables:' as check_type, table_name as name
FROM information_schema.tables
WHERE table_schema = 'public'
UNION ALL
SELECT 'Functions:', routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY check_type, name;
