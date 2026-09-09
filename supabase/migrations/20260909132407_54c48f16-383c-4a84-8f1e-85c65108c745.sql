ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_streak boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_leaderboard boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_study boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inactivity boolean NOT NULL DEFAULT true;