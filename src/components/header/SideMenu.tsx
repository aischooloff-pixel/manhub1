import { useState } from 'react';
import {
  X,
  Home,
  FileText,
  Bookmark,
  User,
  Crown,
  Settings,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/use-profile';
import { SettingsModal } from '@/components/profile/SettingsModal';
import { PremiumModal } from '@/components/profile/PremiumModal';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SideMenu({ isOpen, onClose }: SideMenuProps) {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPremiumOpen, setIsPremiumOpen] = useState(false);

  if (!isOpen) return null;

  const displayName = profile?.show_name !== false ? profile?.first_name || 'Пользователь' : 'Аноним';
  const displayUsername =
    profile?.show_username !== false ? profile?.username || 'user' : profile ? 'скрыт' : 'гость';

  const displayAvatar =
    profile?.show_avatar !== false
      ? profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || profile?.first_name || 'user'}`
      : `https://api.dicebear.com/7.x/shapes/svg?seed=${profile?.id || 'guest'}`;

  const subscriptionTier = profile?.subscription_tier || 'free';
  const isPremium = subscriptionTier === 'premium';
  const isPlus = subscriptionTier === 'plus';
  const isPaidUser = isPremium || isPlus;

  const handleFavoritesClick = () => {
    onClose();
    navigate('/profile');
    // Small delay to ensure navigation completes, then switch tab
    setTimeout(() => {
      const event = new CustomEvent('switch-profile-tab', { detail: 'favorites' });
      window.dispatchEvent(event);
    }, 100);
  };

  const handlePremiumClick = () => {
    setIsPremiumOpen(true);
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };


  const handleModalClose = (setter: (v: boolean) => void) => {
    setter(false);
  };

  // Build menu items based on subscription tier
  const menuItems = [
    { icon: Home, label: 'Главная', path: '/', onClick: undefined },
    { icon: FileText, label: 'Хаб', path: '/hub', onClick: undefined },
    { icon: Bookmark, label: 'Избранное', path: undefined, onClick: handleFavoritesClick },
    { icon: User, label: 'Профиль', path: '/profile', onClick: undefined },
    // Show "Upgrade to Premium" for Plus users, hide for Premium
    ...(isPlus ? [{ icon: Crown, label: 'Перейти на Premium', path: undefined, onClick: handlePremiumClick }] : []),
    // Show "Premium" for free users (leads to Plus first)
    ...(!isPaidUser ? [{ icon: Crown, label: 'Premium', path: undefined, onClick: handlePremiumClick }] : []),
    { icon: Settings, label: 'Настройки', path: undefined, onClick: handleSettingsClick },
    { icon: HelpCircle, label: 'О проекте', path: 'https://telegra.ph/Informaciya-o-proekte-01-01', external: true, onClick: undefined },
    { icon: MessageSquare, label: 'Telegram канал', path: 'https://t.me/Man_HubRu', external: true, onClick: undefined },
  ];

  return (
    <>
      {/* Full-screen overlay to capture all clicks */}
      <div 
        className="fixed inset-0 z-[100]" 
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />

        {/* Side panel */}
        <div 
          className="absolute left-0 top-0 h-full w-72 bg-card shadow-xl animate-slide-right overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-3">
              <img
                src={displayAvatar}
                alt={displayName}
                className="h-10 w-10 rounded-full border border-border"
                loading="lazy"
              />
              <div>
                <p className="font-heading font-semibold">{displayName}</p>
                <p className="text-xs text-muted-foreground">@{displayUsername}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Закрыть меню">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {!profile && (
            <div className="border-b border-border p-4 text-sm text-muted-foreground">
              Откройте приложение из Telegram, чтобы загрузить ваш профиль.
            </div>
          )}

          {/* Menu items */}
          <nav className="p-4" aria-label="Основная навигация">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.label}>
                  {item.external ? (
                    <a
                      href={item.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg p-3 text-foreground transition-colors hover:bg-secondary"
                      onClick={onClose}
                    >
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <span>{item.label}</span>
                    </a>
                  ) : item.onClick ? (
                    <button
                      onClick={item.onClick}
                      className="flex w-full items-center gap-3 rounded-lg p-3 text-foreground transition-colors hover:bg-secondary"
                    >
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <span>{item.label}</span>
                    </button>
                  ) : (
                    <Link
                      to={item.path!}
                      className="flex items-center gap-3 rounded-lg p-3 text-foreground transition-colors hover:bg-secondary"
                      onClick={onClose}
                    >
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <span>{item.label}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* CTA based on subscription tier */}
          {!isPaidUser && (
            <div className="absolute bottom-4 left-4 right-4">
              <Button className="w-full gap-2" onClick={handlePremiumClick}>
                <Crown className="h-4 w-4" />
                Перейти на Plus
              </Button>
            </div>
          )}
          {isPlus && (
            <div className="absolute bottom-4 left-4 right-4">
              <Button className="w-full gap-2" onClick={handlePremiumClick}>
                <Crown className="h-4 w-4" />
                Перейти на Premium
              </Button>
            </div>
          )}
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => handleModalClose(setIsSettingsOpen)} />
      <PremiumModal isOpen={isPremiumOpen} onClose={() => handleModalClose(setIsPremiumOpen)} telegramId={profile?.telegram_id} />
    </>
  );
}
