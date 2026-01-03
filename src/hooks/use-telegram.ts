import { useEffect, useState } from "react";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export function useTelegram() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [webApp, setWebApp] = useState<any>(null);

  useEffect(() => {
    // @ts-ignore
    const tg = window.Telegram?.WebApp;
    if (tg) {
      setWebApp(tg);
      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user);
      }
      // Log start_param for debugging
      console.log('[useTelegram] start_param:', tg.initDataUnsafe?.start_param);
    }
  }, []);

  const openTelegramLink = (url: string) => {
    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const getBotUsername = (): string => {
    // Get bot username from start_param or hardcoded value
    // This should match the bot that has the mini app
    return 'Man_Hub_Bot';
  };

  const getInitData = (): string | null => {
    // @ts-ignore
    return window.Telegram?.WebApp?.initData || null;
  };

  return {
    user,
    webApp,
    isReady: !!webApp,
    openTelegramLink,
    getBotUsername,
    getInitData,
  };
}
