import { useState } from 'react';
import { Bot, MessageCircle, Sparkles, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIAssistantChat } from './AIAssistantChat';
import { UpgradeToPlusModal } from '@/components/profile/UpgradeToPlusModal';
import { cn } from '@/lib/utils';
import { SubscriptionTier } from '@/hooks/use-profile';

interface AIAssistantSectionProps {
  className?: string;
  subscriptionTier?: SubscriptionTier;
}

export function AIAssistantSection({ className, subscriptionTier = 'free' }: AIAssistantSectionProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const hasAccess = subscriptionTier === 'plus' || subscriptionTier === 'premium';

  const handleClick = () => {
    if (hasAccess) {
      setIsChatOpen(true);
    } else {
      setIsUpgradeOpen(true);
    }
  };

  return (
    <>
      <section className={cn('px-4', className)}>
        <div className={cn(
          'rounded-2xl bg-gradient-to-br from-primary/20 via-card to-primary/10 border border-primary/20 p-5',
          !hasAccess && 'opacity-80'
        )}>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading text-lg font-semibold">ИИ Ассистент</h3>
                <Sparkles className="w-4 h-4 text-primary" />
                {!hasAccess && <Lock className="w-4 h-4 text-muted-foreground" />}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {hasAccess 
                  ? 'Персональный помощник для ваших вопросов о саморазвитии, бизнесе и продуктивности'
                  : 'Доступен на тарифе Plus. Персональный помощник для вопросов о саморазвитии и бизнесе'
                }
              </p>
              <Button
                onClick={handleClick}
                variant={hasAccess ? 'default' : 'secondary'}
                className="flex items-center gap-2"
              >
                {hasAccess ? (
                  <>
                    <MessageCircle className="w-4 h-4" />
                    Начать чат
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Перейти на Plus
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <AIAssistantChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />

      <UpgradeToPlusModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        feature="ai"
      />
    </>
  );
}
