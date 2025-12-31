import { X, Crown, Bot, Infinity, MessageCircle, BadgeCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UpgradeToPlusModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: 'ai' | 'articles' | 'bio';
}

export function UpgradeToPlusModal({ isOpen, onClose, feature = 'ai' }: UpgradeToPlusModalProps) {
  if (!isOpen) return null;

  const getTitle = () => {
    switch (feature) {
      case 'ai':
        return 'ИИ Ассистент доступен на Plus';
      case 'articles':
        return 'Лимит публикаций достигнут';
      case 'bio':
        return 'Описание профиля доступно на Plus';
      default:
        return 'Перейдите на Plus';
    }
  };

  const getDescription = () => {
    switch (feature) {
      case 'ai':
        return 'Получите доступ к персональному ИИ ассистенту для вопросов о саморазвитии и бизнесе';
      case 'articles':
        return 'Вы опубликовали 3 статьи сегодня. Перейдите на Plus для безлимитных публикаций';
      case 'bio':
        return 'Добавьте описание в профиль до 50 символов';
      default:
        return 'Разблокируйте все возможности платформы';
    }
  };

  const features = [
    { icon: Bot, text: 'ИИ ассистент' },
    { icon: Infinity, text: 'Безлимитные публикации' },
    { icon: MessageCircle, text: 'Соц сети в профиле' },
    { icon: Users, text: 'Закрытое сообщество' },
    { icon: BadgeCheck, text: 'PRO значок' },
  ];

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card animate-slide-up',
          'md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-sm md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg'
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

        <div className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <Crown className="h-8 w-8 text-primary" />
          </div>

          <h2 className="mb-2 font-heading text-xl font-bold">{getTitle()}</h2>
          <p className="text-sm text-muted-foreground mb-6">{getDescription()}</p>

          <div className="text-left space-y-3 mb-6">
            {features.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="text-center mb-2">
              <span className="text-2xl font-bold">299₽</span>
              <span className="text-muted-foreground">/мес</span>
            </div>
            <Button className="w-full" onClick={onClose}>
              Перейти на Plus
            </Button>
            <Button variant="ghost" className="w-full" onClick={onClose}>
              Позже
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}