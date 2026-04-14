import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UsageState {
  canUse: boolean;
  remainingUses: number;
  currentPlan: 'free' | 'single' | 'weekly' | 'monthly' | null;
  loading: boolean;
  consumeUse: () => Promise<boolean>;
  refreshUsage: () => Promise<void>;
}

export function useUsage(): UsageState {
  const { user, profile, subscription, refreshProfile, configured } = useAuth();
  const [loading, setLoading] = useState(false);

  const freeLeft = profile?.free_uses_remaining ?? 0;
  const subLeft = subscription?.uses_remaining ?? 0;
  const totalLeft = freeLeft + subLeft;

  const currentPlan = subscription?.plan as 'single' | 'weekly' | 'monthly' | null
    ?? (freeLeft > 0 ? 'free' : null);

  const canUse = !configured || totalLeft > 0;

  const consumeUse = useCallback(async (): Promise<boolean> => {
    if (!configured || !user) return true; // no auth = unlimited (dev mode)
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('consume_use', { p_user_id: user.id });
      if (error) {
        console.error('[星谶] consume_use error:', error);
        return false;
      }
      await refreshProfile();
      return data === true;
    } finally {
      setLoading(false);
    }
  }, [user, configured, refreshProfile]);

  const refreshUsage = useCallback(async () => {
    await refreshProfile();
  }, [refreshProfile]);

  return { canUse, remainingUses: totalLeft, currentPlan, loading, consumeUse, refreshUsage };
}
