-- ═══════════════════════════════════════════════════════════════
-- SCHÉMA SUPABASE — À exécuter dans l'éditeur SQL Supabase
-- ═══════════════════════════════════════════════════════════════

-- 1. Templates utilisateurs (générés par l'IA lors de l'onboarding)
CREATE TABLE IF NOT EXISTS user_templates (
    user_id UUID PRIMARY KEY,
    schedule_template JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 2. Plannings hebdomadaires indépendants
--    Chaque semaine est identifiée par (week_key, user_id)
CREATE TABLE IF NOT EXISTS weekly_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_key TEXT NOT NULL,
    user_id UUID NOT NULL,
    schedule_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT weekly_schedules_week_key_user_id_key UNIQUE (week_key, user_id)
);

-- 3. Paramètres utilisateur (titre, tagline, préférences UI)
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 4. Index de performance
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_lookup
    ON weekly_schedules (user_id, week_key);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — Chaque utilisateur ne voit que ses données
-- À exécuter APRÈS avoir créé les tables
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE user_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Politique : chaque utilisateur accède uniquement à ses propres données
CREATE POLICY "users_own_templates" ON user_templates
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_schedules" ON weekly_schedules
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_settings" ON user_settings
    FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- MIGRATION — Si les tables existaient déjà sans RLS ni contraintes
-- Exécuter ces commandes séparément si nécessaire
-- ═══════════════════════════════════════════════════════════════

-- Dédupliquer weekly_schedules avant contrainte UNIQUE :
-- DELETE FROM weekly_schedules
-- WHERE id NOT IN (
--     SELECT DISTINCT ON (week_key, user_id) id
--     FROM weekly_schedules
--     ORDER BY week_key, user_id, updated_at DESC
-- );

-- Ajouter la contrainte UNIQUE sur une table existante :
-- ALTER TABLE weekly_schedules
--     ADD CONSTRAINT weekly_schedules_week_key_user_id_key
--     UNIQUE (week_key, user_id);
