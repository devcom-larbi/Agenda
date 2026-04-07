-- COPIEZ-COLLEZ ce code dans le SQL Editor de Supabase et cliquez sur RUN

-- 1. On crée la table pour stocker les agendas
CREATE TABLE IF NOT EXISTS weekly_schedules (
    week_key TEXT PRIMARY KEY,
    schedule_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. On active les mises à jour en temps réel (Realtime) sur cette table
alter publication supabase_realtime add table weekly_schedules;

-- 3. On désactive le système RLS complexe (puisque c'est un projet personnel, on autorise tout en lecture/écriture)
ALTER TABLE weekly_schedules DISABLE ROW LEVEL SECURITY;
