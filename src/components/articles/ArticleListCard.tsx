import { useState } from 'react';
import { Heart, MessageCircle, Bookmark, Clock, Check, XCircle, ChevronDown, ChevronUp, Play, Crown, Share2 } from 'lucide-react';
import { Article } from '@/types';
import { cn } from '@/lib/utils';
import { AuthorBadge } from '@/components/profile/UserBadges';
import { toast } from 'sonner';

interface ArticleListCardProps {
  article: Article;
  className?: string;
  style?: React.CSSProperties;
  showStatus?: boolean;
  onClick?: () => void;
  isExpanded?: boolean;
}

export function ArticleListCard({ 
  article, 
  className, 
  style, 
  showStatus,
  onClick,
  isExpanded = false
}: ArticleListCardProps) {
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `https://t.me/Man_Hub_bot/Hub?startapp=article_${article.id}`;
    const shareText = `${article.topic || article.title}`;
    
    // @ts-ignore - Telegram WebApp API
    const tgWebApp = window.Telegram?.WebApp;
    
    if (tgWebApp) {
      const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
      tgWebApp.openTelegramLink(telegramShareUrl);
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Ссылка скопирована');
    }
  };
  const getStatusBadge = () => {
    if (!showStatus) return null;
    switch (article.status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] text-yellow-500">
            <Clock className="h-2.5 w-2.5" />
            На модерации
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] text-red-500">
            <XCircle className="h-2.5 w-2.5" />
            Отклонено
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <article
      className={cn(
        'group rounded-2xl bg-secondary/50 overflow-hidden transition-all duration-300',
        isExpanded ? 'ring-1 ring-primary/30' : '',
        className
      )}
      style={style}
    >
      {/* Collapsed Header - Always Visible */}
      <button
        onClick={onClick}
        className="w-full px-4 py-3 text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <img
            src={article.is_anonymous ? '/placeholder.svg' : article.author?.avatar_url || '/placeholder.svg'}
            alt={article.is_anonymous ? 'Аноним' : article.author?.first_name || 'Author'}
            className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-medium text-foreground group-hover:text-primary transition-colors">
              {article.topic || article.title}
              </h3>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {article.is_anonymous ? 'Аноним' : article.author?.first_name}
                {!article.is_anonymous && (article.author?.subscription_tier === 'plus' || article.author?.subscription_tier === 'premium') && (
                  <Crown className="h-3 w-3 text-yellow-500" />
                )}
                {!article.is_anonymous && article.author?.id && (
                  <AuthorBadge userProfileId={article.author.id} variant="compact" />
                )}
              </span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {article.likes_count}
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {article.comments_count}
              </div>
            </div>
          </div>
          {onClick && (
            isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )
          )}
          {!onClick && <Bookmark className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded Content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-4">
          {/* Media */}
          {article.media_url && (
            <div className="mb-4 rounded-xl overflow-hidden">
              {article.media_type === 'youtube' ? (
                <div className="relative aspect-video bg-muted">
                  <img
                    src={`https://img.youtube.com/vi/${article.media_url}/maxresdefault.jpg`}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90">
                      <Play className="h-5 w-5 text-foreground ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={article.media_url}
                  alt={article.title}
                  className="w-full h-auto"
                />
              )}
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {article.preview}
          </p>

          {/* Activity Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                <Heart className="h-5 w-5" />
                <span className="text-sm">{article.likes_count}</span>
              </button>
              <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm">{article.comments_count}</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleShare}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Share2 className="h-5 w-5" />
              </button>
              <button className="text-muted-foreground hover:text-primary transition-colors">
                <Bookmark className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}