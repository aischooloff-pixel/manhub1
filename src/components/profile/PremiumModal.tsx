import { useState, useRef, useEffect } from 'react';
import { X, Check, Crown, Sparkles, MessageCircle, Users, Infinity, BadgeCheck, Bot, FileText, Headphones, Music, ShoppingBag, GraduationCap, ChevronLeft, ChevronRight, Tag, Loader2, ArrowLeft, HelpCircle } from 'lucide-react';
import sbpLogo from '@/assets/sbp-logo.png';
import cryptobotLogo from '@/assets/cryptobot-logo.jpeg';
import telegramStarsLogo from '@/assets/telegram-stars-logo.jpeg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SupportModal } from './SupportModal';
import { useTelegram } from '@/hooks/use-telegram';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  telegramId?: number | null;
}

interface PricingData {
  plus: {
    monthly: number;
    yearly: number;
    monthlyOriginal: number;
    yearlyOriginal: number;
  };
  premium: {
    monthly: number;
    yearly: number;
    monthlyOriginal: number;
    yearlyOriginal: number;
  };
  discount: number;
}

export function PremiumModal({ isOpen, onClose, telegramId: propTelegramId }: PremiumModalProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [currentSlide, setCurrentSlide] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoApplied, setPromoApplied] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const { getInitData, webApp } = useTelegram();
  const [pricing, setPricing] = useState<PricingData>({
    plus: { monthly: 299, yearly: 2510, monthlyOriginal: 598, yearlyOriginal: 5020 },
    premium: { monthly: 2490, yearly: 20916, monthlyOriginal: 4980, yearlyOriginal: 41832 },
    discount: 50,
  });

  useEffect(() => {
    if (isOpen) {
      loadPricing();
      // Reset state when modal opens
      setPromoCode('');
      setPromoDiscount(0);
      setPromoApplied(false);
      setSelectedPlan(null);
    }
  }, [isOpen]);

  const loadPricing = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_pricing')
        .select('*');
      
      if (!error && data) {
        const plusData = data.find(p => p.tier === 'plus');
        const premiumData = data.find(p => p.tier === 'premium');
        
        if (plusData && premiumData) {
          const discount = plusData.discount_percent / 100;
          const yearlyDiscount = plusData.yearly_discount_percent / 100;
          
          // Calculate discounted prices from original prices
          const plusMonthlyDiscounted = Math.round(plusData.monthly_original_price * (1 - discount));
          const plusYearlyDiscounted = Math.round(plusData.yearly_original_price * (1 - discount) * (1 - yearlyDiscount));
          
          const premiumMonthlyDiscounted = Math.round(premiumData.monthly_original_price * (1 - discount));
          const premiumYearlyDiscounted = Math.round(premiumData.yearly_original_price * (1 - discount) * (1 - yearlyDiscount));
          
          setPricing({
            plus: {
              monthly: plusMonthlyDiscounted,
              yearly: plusYearlyDiscounted,
              monthlyOriginal: plusData.monthly_original_price,
              yearlyOriginal: plusData.yearly_original_price,
            },
            premium: {
              monthly: premiumMonthlyDiscounted,
              yearly: premiumYearlyDiscounted,
              monthlyOriginal: premiumData.monthly_original_price,
              yearlyOriginal: premiumData.yearly_original_price,
            },
            discount: plusData.discount_percent,
          });
        }
      }
    } catch (err) {
      console.error('Error loading pricing:', err);
    }
  };

  if (!isOpen) return null;

  // Calculate prices with promo discount applied
  const getPrice = (basePrice: number) => {
    if (promoDiscount > 0) {
      return Math.round(basePrice * (1 - promoDiscount / 100));
    }
    return basePrice;
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Базовый доступ к платформе',
      price: { monthly: 0, yearly: 0 },
      originalPrice: { monthly: 0, yearly: 0 },
      features: [
        { icon: FileText, text: '3 статьи в день' },
        { icon: Headphones, text: 'Подкасты' },
        { icon: Music, text: 'Плейлисты' },
      ],
      popular: false,
    },
    {
      id: 'plus',
      name: 'Plus',
      description: 'Расширенные возможности',
      price: { 
        monthly: getPrice(pricing.plus.monthly), 
        yearly: getPrice(pricing.plus.yearly) 
      },
      originalPrice: { 
        monthly: promoDiscount > 0 ? pricing.plus.monthly : pricing.plus.monthlyOriginal, 
        yearly: promoDiscount > 0 ? pricing.plus.yearly : pricing.plus.yearlyOriginal 
      },
      features: [
        { icon: MessageCircle, text: 'Соц сети в профиле' },
        { icon: FileText, text: 'Описание профиля' },
        { icon: Bot, text: 'ИИ ассистент' },
        { icon: Users, text: 'Закрытое сообщество' },
        { icon: Infinity, text: 'Безлимитные публикации' },
        { icon: BadgeCheck, text: 'PRO значок' },
      ],
      popular: true,
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'Максимум возможностей',
      price: { 
        monthly: getPrice(pricing.premium.monthly), 
        yearly: getPrice(pricing.premium.yearly) 
      },
      originalPrice: { 
        monthly: promoDiscount > 0 ? pricing.premium.monthly : pricing.premium.monthlyOriginal, 
        yearly: promoDiscount > 0 ? pricing.premium.yearly : pricing.premium.yearlyOriginal 
      },
      features: [
        { icon: Sparkles, text: 'Все что в Plus' },
        { icon: Crown, text: 'Сообщество предпринимателей' },
        { icon: GraduationCap, text: 'Менторство от основателя' },
        { icon: ShoppingBag, text: 'Продажа своего продукта' },
      ],
      popular: false,
    },
  ];

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    
    setPromoLoading(true);
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.trim().toUpperCase())
        .eq('is_active', true)
        .maybeSingle();
      
      if (error || !data) {
        toast.error('Промокод не найден или истёк');
        setPromoDiscount(0);
        setPromoApplied(false);
      } else if (data.max_uses && data.uses_count >= data.max_uses) {
        toast.error('Промокод больше не действует');
        setPromoDiscount(0);
        setPromoApplied(false);
      } else {
        setPromoDiscount(data.discount_percent);
        setPromoApplied(true);
        toast.success(`Промокод применён! Скидка ${data.discount_percent}%`);
      }
    } catch (err) {
      console.error('Error applying promo:', err);
      toast.error('Ошибка при проверке промокода');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleSelectPlan = (planId: string) => {
    if (planId === 'plus') {
      setSelectedPlan(planId);
    }
  };

  const handleBackToPlans = () => {
    setSelectedPlan(null);
  };

  const handlePayment = async (methodId: string) => {
    if (methodId !== 'crypto') {
      toast.info('Этот способ оплаты скоро будет доступен');
      return;
    }

    const initData = getInitData();
    
    // Need either initData or telegram_id from profile
    if (!initData && !propTelegramId) {
      toast.error('Не удалось определить пользователя');
      return;
    }

    setPaymentLoading(methodId);
    try {
      const price = getCurrentPlanPrice();
      
      const { data, error } = await supabase.functions.invoke('cryptobot-create-invoice', {
        body: {
          initData: initData || null,
          telegram_id: propTelegramId,
          plan: selectedPlan,
          period: billingPeriod,
          amount: price,
          currency: 'RUB',
        },
      });

      if (error) {
        console.error('Invoice error:', error);
        toast.error('Ошибка создания счёта');
        return;
      }

      if (data?.success && data?.invoice_url) {
        // Open CryptoBot payment - prefer mini_app_invoice_url in Telegram, otherwise bot_invoice_url
        const paymentUrl = data.mini_app_invoice_url || data.invoice_url;
        
        if (webApp?.openTelegramLink && data.mini_app_invoice_url) {
          webApp.openTelegramLink(data.mini_app_invoice_url);
        } else {
          window.open(paymentUrl, '_blank');
        }
        toast.success('Счёт создан! Перейдите к оплате');
      } else {
        toast.error(data?.error || 'Ошибка создания счёта');
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast.error('Произошла ошибка при создании платежа');
    } finally {
      setPaymentLoading(null);
    }
  };

  const paymentMethods = [
    {
      id: 'sbp',
      name: 'СБП',
      description: 'Система быстрых платежей',
      logo: sbpLogo,
      enabled: false,
    },
    {
      id: 'crypto',
      name: 'Крипта',
      description: 'CryptoBot',
      logo: cryptobotLogo,
      enabled: true,
    },
    {
      id: 'stars',
      name: 'Telegram Stars',
      description: 'Звёзды Telegram',
      logo: telegramStarsLogo,
      enabled: false,
    },
  ];

  // Get current plan price for display
  const getCurrentPlanPrice = () => {
    if (!selectedPlan) return 0;
    const plan = plans.find(p => p.id === selectedPlan);
    return plan ? plan.price[billingPeriod] : 0;
  };

  const scrollToSlide = (index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const slideWidth = container.offsetWidth * 0.85;
      container.scrollTo({
        left: index * slideWidth,
        behavior: 'smooth'
      });
      setCurrentSlide(index);
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const slideWidth = container.offsetWidth * 0.85;
      const newSlide = Math.round(container.scrollLeft / slideWidth);
      setCurrentSlide(newSlide);
    }
  };

  return (
    <div className="fixed inset-0 z-[110]">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 max-h-[95vh] overflow-y-auto rounded-t-2xl bg-card animate-slide-up',
          'md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-4xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:max-h-[90vh]'
        )}
      >
        <div className="sticky top-0 z-10 flex justify-center bg-card pt-3 md:hidden">
          <div className="h-1 w-12 rounded-full bg-border" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 h-8 w-8 z-20"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="p-6">
          {selectedPlan ? (
            <>
              {/* Payment Methods Screen */}
              <div className="mb-6">
                <button
                  onClick={handleBackToPlans}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Назад к тарифам
                </button>
                
                <div className="text-center mb-6">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                    <Crown className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="mb-2 font-heading text-2xl font-bold">Оплата Plus</h2>
                  <p className="text-muted-foreground">
                    <span className="text-2xl font-bold text-foreground">{getCurrentPlanPrice()}₽</span>
                    <span className="text-sm">/{billingPeriod === 'monthly' ? 'мес' : 'год'}</span>
                  </p>
                </div>

                <h3 className="text-lg font-semibold mb-4 text-center">Выберите способ оплаты</h3>
                
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => handlePayment(method.id)}
                      disabled={paymentLoading !== null || !method.enabled}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border w-full text-left transition-all",
                        method.enabled 
                          ? "border-border bg-card/50 hover:border-primary hover:bg-primary/5 cursor-pointer" 
                          : "border-border/50 bg-card/30 opacity-60 cursor-not-allowed"
                      )}
                    >
                      <div className="flex-shrink-0">
                        <img src={method.logo} alt={method.name} className="h-10 w-10 rounded-lg object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{method.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {method.enabled ? method.description : 'Скоро'}
                        </p>
                      </div>
                      {paymentLoading === method.id && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-8 pt-4 border-t border-border">
                  <button
                    onClick={() => setShowSupportModal(true)}
                    className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                    По всем вопросам к Технической Поддержке
                  </button>
                </div>
              </div>

              <SupportModal
                isOpen={showSupportModal}
                onClose={() => setShowSupportModal(false)}
              />
            </>
          ) : (
            <>
          {/* Header */}
          <div className="mb-6 text-center">
            <h2 className="mb-2 font-heading text-2xl font-bold">Выберите тариф</h2>
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="rounded-full bg-destructive px-4 py-2 text-base font-bold text-destructive-foreground">
                Скидка {promoDiscount > 0 ? promoDiscount : pricing.discount}%
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              Выберите годовой тариф для экономии 30%
            </p>
          </div>

          {/* Promo Code Input */}
          <div className="mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Промокод"
                  className="pl-9"
                  disabled={promoApplied}
                />
              </div>
              <Button
                onClick={handleApplyPromo}
                disabled={promoLoading || promoApplied || !promoCode.trim()}
                variant={promoApplied ? 'secondary' : 'default'}
              >
                {promoLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : promoApplied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  'Применить'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Промокоды в нашем <a href="https://t.me/Man_HubRu" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">канале</a>
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex items-center rounded-full bg-secondary p-1">
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-all',
                  billingPeriod === 'yearly'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Год (-30%)
              </button>
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-all',
                  billingPeriod === 'monthly'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Месяц
              </button>
            </div>
          </div>

          {/* Plans - Desktop Grid */}
          <div className="hidden md:grid md:grid-cols-3 gap-4 mb-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  'relative rounded-2xl border-2 p-6 transition-all',
                  plan.popular
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-border bg-card hover:border-primary/50'
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground whitespace-nowrap">
                      Выбирают чаще
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="font-heading text-xl font-bold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="font-heading text-3xl font-bold">
                      {plan.price[billingPeriod]}₽
                    </span>
                    <span className="text-sm text-muted-foreground">
                      /{billingPeriod === 'monthly' ? 'мес' : 'год'}
                    </span>
                  </div>
                  {plan.originalPrice[billingPeriod] > 0 && (
                    <p className="text-sm text-muted-foreground line-through">
                      {plan.originalPrice[billingPeriod]}₽
                    </p>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm">{feature.text}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    className="w-full"
                    variant={plan.id === 'free' ? 'secondary' : 'default'}
                    disabled={plan.id === 'free' || plan.id === 'premium'}
                  >
                    {plan.id === 'free' ? 'Текущий план' : plan.id === 'plus' ? 'Выбрать' : 'Скоро'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Plans - Mobile Carousel */}
          <div className="md:hidden mb-6">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {plans.map((plan, index) => (
                <div
                  key={plan.id}
                  className={cn(
                    'relative flex-shrink-0 w-[85%] rounded-2xl border-2 p-5 snap-center transition-all',
                    plan.popular
                      ? 'border-primary bg-primary/5 shadow-lg'
                      : 'border-border bg-card'
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground whitespace-nowrap">
                        Выбирают чаще
                      </span>
                    </div>
                  )}

                  <div className="mb-4 mt-2">
                    <h3 className="font-heading text-xl font-bold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="font-heading text-3xl font-bold">
                        {plan.price[billingPeriod]}₽
                      </span>
                      <span className="text-sm text-muted-foreground">
                        /{billingPeriod === 'monthly' ? 'мес' : 'год'}
                      </span>
                    </div>
                    {plan.originalPrice[billingPeriod] > 0 && (
                      <p className="text-sm text-muted-foreground line-through">
                        {plan.originalPrice[billingPeriod]}₽
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-sm">{feature.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center">
                    <Button
                      onClick={() => handleSelectPlan(plan.id)}
                      className="w-full"
                      variant={plan.id === 'free' ? 'secondary' : 'default'}
                      disabled={plan.id === 'free' || plan.id === 'premium'}
                    >
                      {plan.id === 'free' ? 'Текущий план' : plan.id === 'plus' ? 'Выбрать' : 'Скоро'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center gap-2 mt-4">
              {plans.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollToSlide(index)}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    currentSlide === index
                      ? 'w-6 bg-primary'
                      : 'w-2 bg-border'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Info text */}
          <a 
            href="https://t.me/Man_HubRu" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block text-center text-sm text-muted-foreground hover:text-primary transition-colors underline"
          >
            Подробная информация о тарифах доступна в нашем Telegram-канале
          </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
