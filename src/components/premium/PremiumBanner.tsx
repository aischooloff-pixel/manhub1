import { Crown, Bot, Users, Infinity, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PremiumBannerProps {
  className?: string;
  onClick?: () => void;
}

export function PremiumBanner({ className, onClick }: PremiumBannerProps) {
  const features = [
    { icon: Bot, label: 'ИИ ассистент' },
    { icon: Users, label: 'Закрытое сообщество' },
    { icon: Infinity, label: 'Безлимит публикаций' },
  ];

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-lg mx-4 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]',
        className
      )}
      onClick={onClick}
    >
      {/* Background with gradient */}
      <div className="absolute inset-0 premium-gradient" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvc3ZnPg==')] opacity-50" />
      
      <div className="relative p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/10">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold">
              Premium
            </h3>
            <p className="text-xs text-muted-foreground">
              Получите максимум от ManHub
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          {features.map((feature) => (
            <div
              key={feature.label}
              className="flex flex-col items-center gap-2 rounded-lg bg-background/5 p-3 text-center"
            >
              <feature.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">
                {feature.label}
              </span>
            </div>
          ))}
        </div>

        <Button className="w-full font-semibold" size="lg">
          Перейти на Plus
        </Button>
      </div>
    </section>
  );
}
