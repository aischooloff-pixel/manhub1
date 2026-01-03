import { cn } from '@/lib/utils';
import mLogo from '@/assets/m-logo.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const sizes = {
    sm: { container: 'h-6 w-6', text: 'text-lg' },
    md: { container: 'h-8 w-8', text: 'text-xl' },
    lg: { container: 'h-10 w-10', text: 'text-2xl' },
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img 
        src={mLogo} 
        alt="ManHub Logo" 
        className={cn('rounded-lg object-cover', sizes[size].container)}
      />
      <span className={cn('font-heading font-semibold tracking-tight', sizes[size].text)}>
        ManHub
      </span>
    </div>
  );
}
