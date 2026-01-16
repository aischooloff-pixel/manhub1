import { useState } from 'react';
import { X, Heart, MessageCircle, Bookmark, ChevronDown, ChevronUp, Play, Eye } from 'lucide-react';
import { Article } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AllArticlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: Article[];
  title?: string;
}

export function AllArticlesModal({ isOpen, onClose, articles, title = 'Все статьи' }: AllArticlesModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/95 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal - Full screen */}
      <div className="absolute inset-0 flex flex-col animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-background/95 backdrop-blur-sm px-4 py-4 border-b border-border">
          <h2 className="font-heading text-xl font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {articles.length > 0 ? (
              articles.map((article, index) => (
                <div
                  key={article.id}
                  className={cn(
                    'rounded-2xl bg-card overflow-hidden transition-all duration-300 animate-slide-up',
                    expandedId === article.id ? 'ring-1 ring-primary/30' : ''
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Collapsed View */}
                  <button
                    onClick={() => toggleExpand(article.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={article.is_anonymous ? '/placeholder.svg' : article.author?.avatar_url || '/placeholder.svg'}
                        alt={article.is_anonymous ? 'Аноним' : article.author?.first_name || 'Author'}
                        className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-foreground truncate">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{article.is_anonymous ? 'Аноним' : article.author?.first_name}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {article.views_count || 0}
                          </div>
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
                      {expandedId === article.id ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  </button>

                  {/* Expanded View */}
                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-300',
                      expandedId === article.id ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
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
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90">
                                  <Play className="h-6 w-6 text-foreground ml-1" />
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
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-4">
                        {article.preview}
                      </p>

                      {/* Activity */}
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
                        <button className="text-muted-foreground hover:text-primary transition-colors">
                          <Bookmark className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-12 text-center text-muted-foreground">
                Нет статей
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}