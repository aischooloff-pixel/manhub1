import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Crown,
  FileText,
  Bookmark,
  History,
  Settings,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTelegram } from '@/hooks/use-telegram';
import { SettingsModal } from './SettingsModal';
import { PremiumModal } from './PremiumModal';

interface ProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ user: defaultUser, isOpen, onClose }: ProfileModalProps) {
  const { user: tgUser } = useTelegram();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPremiumOpen, setIsPremiumOpen] = useState(false);

  if (!isOpen) return null;

  const displayUser = tgUser ? {
    ...defaultUser,
    first_name: tgUser.first_name,
    last_name: tgUser.last_name || '',
    username: tgUser.username || defaultUser.username,
    avatar_url: tgUser.photo_url || defaultUser.avatar_url,
    is_premium: tgUser.is_premium || defaultUser.is_premium
  } : defaultUser;

  const handleMenuClick = (tab: string) => {
    onClose();
    navigate('/profile');
    // Switch tab after navigation
    setTimeout(() => {
      const event = new CustomEvent('switch-profile-tab', { detail: tab });
      window.dispatchEvent(event);
    }, 100);
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const handlePremiumClick = () => {
    setIsPremiumOpen(true);
  };

  const menuItems = [
    {
      icon: FileText,
      label: 'Мои статьи',
      value: displayUser.articles_count,
      onClick: () => handleMenuClick('articles'),
    },
    {
      icon: Bookmark,
      label: 'Избранное',
      onClick: () => handleMenuClick('favorites'),
    },
    {
      icon: History,
      label: 'История активности',
      onClick: () => handleMenuClick('activity'),
    },
    {
      icon: Settings,
      label: 'Настройки',
      onClick: handleSettingsClick,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[100]">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />

        {/* Modal - Full screen on mobile */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-card animate-slide-up',
            'md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg'
          )}
        >
          {/* Handle bar for mobile */}
          <div className="sticky top-0 z-10 flex justify-center bg-card pt-3 md:hidden">
            <div className="h-1 w-12 rounded-full bg-border" />
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="p-6">
            {/* Profile Header */}
            <div className="mb-6 flex flex-col items-center text-center">
              <button
                onClick={() => handleMenuClick('articles')}
                className="relative mb-4 group cursor-pointer"
              >
                <img
                  src={displayUser.avatar_url}
                  alt={displayUser.first_name}
                  className="h-20 w-20 rounded-full border-2 border-border transition-transform group-hover:scale-105"
                />
                {displayUser.is_premium && (
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background">
                    <Crown className="h-3 w-3" />
                  </div>
                )}
              </button>

              <button 
                onClick={() => handleMenuClick('articles')}
                className="mb-1 font-heading text-xl font-semibold hover:text-primary transition-colors"
              >
                {displayUser.first_name} {displayUser.last_name}
              </button>
              <button 
                onClick={() => handleMenuClick('articles')}
                className="mb-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                @{displayUser.username}
              </button>

              <button
                onClick={() => handleMenuClick('articles')}
                className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 hover:bg-muted/80 transition-colors"
              >
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{displayUser.reputation}</span>
                <span className="text-sm text-muted-foreground">репутации</span>
              </button>
            </div>

            {/* Menu Items */}
            <div className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  className="flex w-full items-center justify-between rounded-lg bg-muted/50 p-4 transition-colors hover:bg-muted"
                  onClick={item.onClick}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.value !== undefined && (
                      <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-sm">
                        {item.value}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>

            {/* Premium CTA */}
            {!displayUser.is_premium && (
              <div className="mt-6">
                <Button className="w-full gap-2" size="lg" onClick={handlePremiumClick}>
                  <Crown className="h-4 w-4" />
                  Перейти на Premium
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <PremiumModal isOpen={isPremiumOpen} onClose={() => setIsPremiumOpen(false)} telegramId={tgUser?.id} />
    </>
  );
}