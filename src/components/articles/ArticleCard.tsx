import { Heart, MessageCircle, Bookmark, TrendingUp, Share2, Crown } from 'lucide-react';
import { Article } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AuthorBadge } from '@/components/profile/UserBadges';

interface ArticleCardProps {
  article: Article;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  onAuthorClick?: (authorId: string) => void;
}

export function ArticleCard({ article, variant = 'default', className, style, onClick, onAuthorClick }: ArticleCardProps) {
  const author = article.is_anonymous ? null : article.author;

  if (variant === 'featured') {
    return (
      <article
        onClick={onClick}
        className={cn(
          'group relative flex h-[320px] w-[280px] flex-shrink-0 flex-col overflow-hidden rounded-lg bg-card transition-smooth hover:bg-card-elevated cursor-pointer',
          'shadow-card hover:shadow-elevated',
          className
        )}
        style={style}
      >
        {article.media_url && (
          <div className="relative h-40 overflow-hidden">
            <img
              src={article.media_url}
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          </div>
        )}
        
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 flex items-center gap-2">
            {author ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAuthorClick) onAuthorClick(author.id);
                }}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <img
                  src={author.avatar_url}
                  alt={author.first_name}
                  className="h-6 w-6 rounded-full"
                />
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {(author.subscription_tier === 'plus' || author.subscription_tier === 'premium') && (
                    <Crown className="h-3.5 w-3.5 text-yellow-500" />
                  )}
                  {author.first_name}
                </span>
                {author.id && <AuthorBadge userProfileId={author.id} className="text-xs" />}
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">Аноним</span>
            )}
          </div>

          <h3 className="mb-2 line-clamp-2 font-heading text-sm font-semibold leading-tight">
            {article.topic || article.title}
          </h3>
          
          <p className="mb-auto line-clamp-2 text-xs text-muted-foreground">
            {article.preview}
          </p>

          <div className="mt-3 flex items-center gap-3 text-muted-foreground">
            <button className="flex items-center gap-1 text-xs transition-colors hover:text-foreground">
              <Heart className="h-3.5 w-3.5" />
              <span>{article.likes_count}</span>
            </button>
            <button className="flex items-center gap-1 text-xs transition-colors hover:text-foreground">
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{article.comments_count}</span>
            </button>
            <button className="flex items-center gap-1 text-xs transition-colors hover:text-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+{article.rep_score}</span>
            </button>
          </div>
        </div>
      </article>
    );
  }

  if (variant === 'compact') {
    return (
      <article
        onClick={onClick}
        className={cn(
          'group flex gap-4 rounded-lg bg-card p-4 transition-smooth hover:bg-card-elevated cursor-pointer',
          className
        )}
        style={style}
      >
        {article.media_url && (
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md">
            <img
              src={article.media_url}
              alt={article.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        
        <div className="flex flex-1 flex-col">
          <h3 className="mb-1 line-clamp-2 font-heading text-sm font-semibold">
            {article.title}
          </h3>
          <p className="mb-2 line-clamp-1 text-xs text-muted-foreground">
            {article.preview}
          </p>
          <div className="mt-auto flex items-center gap-3 text-muted-foreground">
            <span className="flex items-center gap-1 text-xs">
              <Heart className="h-3 w-3" />
              {article.likes_count}
            </span>
            <span className="flex items-center gap-1 text-xs">
              <MessageCircle className="h-3 w-3" />
              {article.comments_count}
            </span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      onClick={onClick}
      className={cn(
        'group overflow-hidden rounded-lg bg-card transition-smooth hover:bg-card-elevated shadow-card cursor-pointer',
        className
      )}
      style={style}
    >
      {article.media_url && (
        <div className="relative aspect-video overflow-hidden">
          <img
            src={article.media_url}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          {author ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onAuthorClick) onAuthorClick(author.id);
              }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <img
                src={author.avatar_url}
                alt={author.first_name}
                className="h-8 w-8 rounded-full"
              />
              <div>
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {(author.subscription_tier === 'plus' || author.subscription_tier === 'premium') && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                  {author.first_name} {author.last_name}
                  {author.id && <AuthorBadge userProfileId={author.id} className="text-sm" />}
                </span>
                <span className="text-xs text-muted-foreground">
                  Rep: {author.reputation}
                </span>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <span className="text-xs">?</span>
              </div>
              <span className="text-sm text-muted-foreground">Аноним</span>
            </div>
          )}
        </div>

        <h3 className="mb-2 font-heading text-lg font-semibold leading-tight">
          {article.topic || article.title}
        </h3>
        
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {article.preview}
        </p>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 px-3 text-muted-foreground hover:text-foreground"
            >
              <Heart className="h-4 w-4" />
              <span className="text-xs">{article.likes_count}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 px-3 text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{article.comments_count}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 px-3 text-muted-foreground hover:text-foreground"
            >
              <Bookmark className="h-4 w-4" />
              <span className="text-xs">{article.favorites_count}</span>
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              +{article.rep_score}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
