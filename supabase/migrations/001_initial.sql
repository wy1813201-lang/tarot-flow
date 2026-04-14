-- 星谶 Starprophet - Initial Schema
-- Run this in your Supabase SQL Editor

-- Profiles: extends auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  free_uses_remaining INT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('single', 'weekly', 'monthly')),
  uses_remaining INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  order_no TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscriptions"
  ON subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_subscriptions_user_expires
  ON subscriptions(user_id, expires_at DESC);

-- Reading history
CREATE TABLE reading_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  spread_type TEXT NOT NULL,
  is_strict_mode BOOLEAN NOT NULL DEFAULT false,
  hash TEXT NOT NULL,
  cards JSONB NOT NULL DEFAULT '[]',
  reading JSONB,
  deep_analysis JSONB,
  supplementary_cards JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own history"
  ON reading_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
  ON reading_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history"
  ON reading_history FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_reading_history_user_created
  ON reading_history(user_id, created_at DESC);

-- Pending orders (for payment tracking)
CREATE TABLE pending_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  order_no TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('single', 'weekly', 'monthly')),
  amount_cents INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pending_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own orders"
  ON pending_orders FOR SELECT USING (auth.uid() = user_id);

-- Atomic usage consumption RPC
CREATE OR REPLACE FUNCTION consume_use(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_free INT;
  v_sub_id UUID;
  v_uses INT;
BEGIN
  -- Try free uses first
  SELECT free_uses_remaining INTO v_free
    FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF v_free > 0 THEN
    UPDATE profiles SET free_uses_remaining = free_uses_remaining - 1,
                        updated_at = now()
    WHERE id = p_user_id;
    RETURN TRUE;
  END IF;

  -- Try active subscription
  SELECT id, uses_remaining INTO v_sub_id, v_uses
    FROM subscriptions
    WHERE user_id = p_user_id
      AND uses_remaining > 0
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

  IF v_sub_id IS NOT NULL AND v_uses > 0 THEN
    UPDATE subscriptions SET uses_remaining = uses_remaining - 1
    WHERE id = v_sub_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
