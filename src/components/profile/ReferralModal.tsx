import { useState, useEffect } from 'react';
import { X, Copy, Users, Wallet, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTelegram } from '@/hooks/use-telegram';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode: string | null;
}

interface ReferralStats {
  referralCount: number;
  totalEarnings: number;
  earnings: Array<{
    id: string;
    purchase_amount: number;
    earning_amount: number;
    purchase_type: string;
    created_at: string;
    referred_name: string;
  }>;
}

export function ReferralModal({ isOpen, onClose, referralCode }: ReferralModalProps) {
  const { webApp } = useTelegram();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const botUsername = 'Man_Hub_Bot';
  const referralLink = referralCode 
    ? `https://t.me/${botUsername}?start=ref_${referralCode}` 
    : '';

  useEffect(() => {
    const loadStats = async () => {
      if (!isOpen || !webApp?.initData) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('tg-referral-stats', {
          body: { initData: webApp.initData },
        });

        if (!error && data) {
          setStats(data);
        }
      } catch (err) {
        console.error('Error loading referral stats:', err);
      }
      setLoading(false);
    };

    loadStats();
  }, [isOpen, webApp?.initData]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Ссылка скопирована');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Не удалось скопировать');
    }
  };

  const handleShare = () => {
    if (webApp) {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Присоединяйся к ManHub!')}`;
      webApp.openTelegramLink(shareUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-card animate-slide-up',
          'md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg'
        )}
      >
        <div className="sticky top-0 z-10 flex justify-center bg-card pt-3 md:hidden">
          <div className="h-1 w-12 rounded-full bg-border" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="p-6">
          <h2 className="font-heading text-xl font-semibold mb-2">Реферальная система</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Приглашай друзей и получай 30% от их покупок
          </p>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Приглашено</span>
              </div>
              {loading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-2xl font-bold">{stats?.referralCount || 0}</p>
              )}
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Заработано</span>
              </div>
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold text-green-500">
                  {stats?.totalEarnings || 0} ₽
                </p>
              )}
            </div>
          </div>

          {/* Referral Link */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block">Ваша ссылка</label>
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm truncate">
                {referralLink || 'Загрузка...'}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                disabled={!referralCode}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Referral Info Link */}
          <a
            href="https://telegra.ph/Hj-01-01-5"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-primary hover:underline mb-4"
          >
            ℹ️ Информация о реферальной системе
          </a>

          {/* Share Button */}
          <Button onClick={handleShare} className="w-full gap-2 mb-6" disabled={!referralCode}>
            <Share2 className="h-4 w-4" />
            Поделиться в Telegram
          </Button>

          {/* Earnings History */}
          {!loading && stats?.earnings && stats.earnings.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">История начислений</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stats.earnings.map((earning) => {
                  // Parse purchase_type: "stars_plus_monthly", "cryptobot_premium_yearly", "manual_plus_monthly"
                  const parts = earning.purchase_type.split('_');
                  const plan = parts.includes('premium') ? 'Premium' : parts.includes('plus') ? 'Plus' : 'Подписка';
                  const period = parts.includes('yearly') ? 'год' : 'месяц';
                  
                  return (
                    <div
                      key={earning.id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{earning.referred_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {plan} на {period}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(earning.created_at).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-green-500">
                        +{earning.earning_amount.toFixed(0)} ₽
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && (!stats?.earnings || stats.earnings.length === 0) && (
            <p className="text-center text-sm text-muted-foreground py-4">
              История начислений пуста
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
