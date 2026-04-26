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


-- ═══════════════════════════════════════════════════════════════
-- BLOCKS — Blocs de planning par semaine et par jour
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_key TEXT NOT NULL,
    day_name TEXT NOT NULL,
    time JSONB,
    label TEXT NOT NULL,
    category TEXT,
    priority TEXT,
    description TEXT,
    note TEXT,
    color TEXT,
    emoji TEXT,
    bg_opacity TEXT DEFAULT '12',
    done BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_type TEXT NOT NULL DEFAULT 'none',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blocks_user_week ON blocks (user_id, week_key);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_blocks" ON blocks
    FOR ALL USING (auth.uid() = user_id);

-- Migration — si la table blocks existait déjà sans ces colonnes :
-- ALTER TABLE blocks ADD COLUMN IF NOT EXISTS note TEXT;
-- ALTER TABLE blocks ADD COLUMN IF NOT EXISTS recurrence_type TEXT NOT NULL DEFAULT 'none';
-- ALTER TABLE blocks ADD COLUMN IF NOT EXISTS position INTEGER;


-- ═══════════════════════════════════════════════════════════════
-- TABLES ADDITIONNELLES — Objectifs, IA, Quotas
-- ═══════════════════════════════════════════════════════════════

-- 5. Objectifs personnels (goals)
--    type : 'checkbox' | 'counter' | 'duration'
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    emoji TEXT,
    type TEXT NOT NULL DEFAULT 'checkbox',
    target NUMERIC,
    unit TEXT,
    color TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON goals (user_id, position);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_goals" ON goals
    FOR ALL USING (auth.uid() = user_id);


-- 6. Progression quotidienne des objectifs
--    Une ligne par (user_id, goal_id, date)
CREATE TABLE IF NOT EXISTS goal_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    value NUMERIC NOT NULL DEFAULT 0,
    CONSTRAINT goal_progress_unique UNIQUE (user_id, goal_id, date)
);

CREATE INDEX IF NOT EXISTS idx_goal_progress_user_date ON goal_progress (user_id, date);

ALTER TABLE goal_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_goal_progress" ON goal_progress
    FOR ALL USING (auth.uid() = user_id);


-- 7. Historique des messages IA (FloatingChat)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages (user_id, created_at DESC);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_chat_messages" ON chat_messages
    FOR ALL USING (auth.uid() = user_id);


-- 8. Récapitulatifs journaliers générés par l'IA (JournalView)
CREATE TABLE IF NOT EXISTS journal_recaps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_key TEXT NOT NULL,
    day_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT journal_recaps_unique UNIQUE (user_id, week_key, day_name)
);

CREATE INDEX IF NOT EXISTS idx_journal_recaps_user ON journal_recaps (user_id, week_key);

ALTER TABLE journal_recaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_journal_recaps" ON journal_recaps
    FOR ALL USING (auth.uid() = user_id);


-- 9. Abonnements utilisateurs (useQuota)
--    plan_id : 'free' | 'pro' | 'premium'
CREATE TABLE IF NOT EXISTS user_subscriptions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL DEFAULT 'free',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_subscriptions" ON user_subscriptions
    FOR ALL USING (auth.uid() = user_id);


-- 10. Compteurs d'utilisation mensuelle de l'IA (useQuota)
--     Une ligne par (user_id, month) où month = 'YYYY-MM'
CREATE TABLE IF NOT EXISTS usage_counters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    ai_calls_count INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT usage_counters_unique UNIQUE (user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_user ON usage_counters (user_id, month);

ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_usage_counters" ON usage_counters
    FOR ALL USING (auth.uid() = user_id);
