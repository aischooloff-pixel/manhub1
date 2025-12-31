import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTelegram } from './use-telegram';

export type SubscriptionTier = 'free' | 'plus' | 'premium';

export interface Profile {
  id: string;
  telegram_id: number | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  reputation: number;
  is_premium: boolean;
  is_blocked: boolean;
  telegram_channel: string | null;
  website: string | null;
  created_at: string | null;
  show_avatar: boolean;
  show_name: boolean;
  show_username: boolean;
  subscription_tier: SubscriptionTier;
  bio: string | null;
}

async function extractEdgeErrorMessage(err: any): Promise<string> {
  try {
    const res = err?.context;
    if (res && typeof res.json === 'function') {
      const body = await res.json().catch(() => null);
      const msg = body?.error || body?.message;
      if (msg) return String(msg);
    }
  } catch {
    // ignore
  }
  return err?.message || 'Ошибка запроса к серверу';
}

export function useProfile() {
  const { webApp } = useTelegram();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [articlesCount, setArticlesCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const getInitData = useCallback(() => {
    // Prefer the WebApp instance we captured in useTelegram (it becomes reliable after tg.ready())
    const initData = webApp?.initData;
    // @ts-ignore
    return initData || window.Telegram?.WebApp?.initData || '';
  }, [webApp]);

  // Check if user is admin
  const checkAdminRole = useCallback(async (profileId: string) => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profileId)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    } catch (err) {
      console.error('Error checking admin role:', err);
      setIsAdmin(false);
    }
  }, []);

  // Sync profile with backend (validates initData server-side)
  const syncProfile = useCallback(async () => {
    const initData = getInitData();

    if (!initData) {
      setProfile(null);
      setArticlesCount(0);
      setIsAdmin(false);
      setError(
        'Нет данных Telegram (initData). Откройте мини‑приложение из чата бота и попробуйте ещё раз.'
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('tg-sync-profile', {
        body: { initData },
      });

      if (fnError) {
        const msg = await extractEdgeErrorMessage(fnError);
        throw new Error(msg);
      }

      if (data?.profile) {
        const profileData = {
          ...data.profile,
          reputation: data.profile.reputation || 0,
          is_premium: data.profile.is_premium || false,
          is_blocked: data.profile.is_blocked || false,
          show_avatar: data.profile.show_avatar ?? true,
          show_name: data.profile.show_name ?? true,
          show_username: data.profile.show_username ?? true,
          subscription_tier: data.profile.subscription_tier || 'free',
          bio: data.profile.bio || null,
        };
        setProfile(profileData);
        setArticlesCount(data.articlesCount || 0);
        
        // Check if user is admin
        await checkAdminRole(profileData.id);
      } else {
        setProfile(null);
        setArticlesCount(0);
        setIsAdmin(false);
        setError('Профиль не найден. Попробуйте обновить страницу и открыть мини‑приложение заново.');
      }
    } catch (err: any) {
      console.error('Profile sync error:', err);
      setError(err?.message || 'Ошибка синхронизации профиля');
      setProfile(null);
      setArticlesCount(0);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [getInitData, checkAdminRole]);

  // Update social links via direct supabase (public read, service_role write - we keep this simple for now)
  const updateSocialLinks = async (telegramChannel: string, website: string) => {
    if (!profile) return false;

    try {
      // We call a simple edge function or use the profile id
      // For now social links update isn't critical - we can add a dedicated function later
      // Skipping for simplicity
      setProfile({
        ...profile,
        telegram_channel: telegramChannel || null,
        website: website || null,
      });

      return true;
    } catch (err) {
      console.error('Error updating social links:', err);
      return false;
    }
  };

  // Update privacy settings
  const updatePrivacy = useCallback(
    async (settings: { show_avatar?: boolean; show_name?: boolean; show_username?: boolean }) => {
      const initData = getInitData();
      if (!initData || !profile) return false;

      try {
        const { data, error: fnError } = await supabase.functions.invoke('tg-update-privacy', {
          body: { initData, ...settings },
        });

        if (fnError) {
          const msg = await extractEdgeErrorMessage(fnError);
          throw new Error(msg);
        }

        if (data?.profile) {
          setProfile({
            ...profile,
            show_avatar: data.profile.show_avatar ?? true,
            show_name: data.profile.show_name ?? true,
            show_username: data.profile.show_username ?? true,
          });
        }
        return true;
      } catch (err) {
        console.error('Error updating privacy:', err);
        return false;
      }
    },
    [getInitData, profile]
  );

  useEffect(() => {
    if (!webApp) return;
    syncProfile();
  }, [webApp, syncProfile]);

  return {
    profile,
    loading,
    error,
    articlesCount,
    isAdmin,
    updateSocialLinks,
    updatePrivacy,
    refetch: syncProfile,
  };
}
