import { useState, useEffect } from 'react';
import { X, Shield, AlertTriangle, Ban, Link2, MessageSquare, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingViews: number;
}

const HUB_RULES_STORAGE_KEY = 'manhub_rules_views';
const MAX_VIEWS = 3;

const rules = [
  {
    icon: Ban,
    title: 'Уважение к пользователям',
    description: 'Запрещены оскорбления, унижения, травля и любые формы агрессии в адрес других участников сообщества.',
  },
  {
    icon: AlertTriangle,
    title: 'Достоверная информация',
    description: 'Публикуйте только проверенную информацию. Фейки, дезинформация и вводящий в заблуждение контент будут удалены.',
  },
  {
    icon: Shield,
    title: 'Без запрещённого контента',
    description: 'Запрещён контент 18+, шок-контент, насилие, треш и любые материалы, нарушающие законодательство.',
  },
  {
    icon: Link2,
    title: 'Без рекламы и спама',
    description: 'Нельзя рекламировать свои каналы, аккаунты, продукты. Запрещён спам, самопиар и размещение сторонних ссылок.',
  },
  {
    icon: MessageSquare,
    title: 'Нейтральные темы',
    description: 'Избегайте обсуждения религии, политики, а также публикации персональных данных других людей.',
  },
];

export function RulesModal({ isOpen, onClose, remainingViews }: RulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-md animate-fade-in" />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4 animate-scale-in">
        <div className="w-full max-w-md max-h-[85vh] rounded-2xl bg-card shadow-xl flex flex-col">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold">Правила сообщества</h2>
                <p className="text-sm text-muted-foreground">Ознакомьтесь перед публикацией</p>
              </div>
            </div>
          </div>

          {/* Rules List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {rules.map((rule, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <rule.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm mb-1">{index + 1}. {rule.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rule.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-6 pt-4 border-t border-border/50">
            {remainingViews > 1 && (
              <p className="text-xs text-center text-muted-foreground mb-4">
                Это окно появится ещё {remainingViews - 1} {remainingViews - 1 === 1 ? 'раз' : 'раза'}
              </p>
            )}
            <Button onClick={onClose} className="w-full gap-2" size="lg">
              <CheckCircle className="h-4 w-4" />
              Ознакомился
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useRulesModal() {
  const [showRules, setShowRules] = useState(false);
  const [viewCount, setViewCount] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(HUB_RULES_STORAGE_KEY);
    const currentViews = stored ? parseInt(stored, 10) : 0;
    setViewCount(currentViews);

    if (currentViews < MAX_VIEWS) {
      // Small delay to let the page load first
      const timer = setTimeout(() => setShowRules(true), 300);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeRules = () => {
    const newCount = viewCount + 1;
    localStorage.setItem(HUB_RULES_STORAGE_KEY, newCount.toString());
    setViewCount(newCount);
    setShowRules(false);
  };

  return {
    showRules,
    closeRules,
    remainingViews: MAX_VIEWS - viewCount,
  };
}
