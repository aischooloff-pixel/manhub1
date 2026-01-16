import { useState, useEffect } from 'react';
import { X, Search, Heart, MessageCircle, Bookmark, TrendingUp, Share2, Loader2, Plus, Pin, Filter } from 'lucide-react';
import { Article } from '@/types';
import { Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategoryList } from '@/components/categories/CategoryList';
import { ArticleDetailModal } from '@/components/articles/ArticleDetailModal';
import { CreateArticleModal } from '@/components/articles/CreateArticleModal';
import { PublicProfileModal } from '@/components/profile/PublicProfileModal';
import { cn } from '@/lib/utils';
import { mockCategories } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type FilterType = 'none' | 'popular' | 'verified';

interface FullArticlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialArticles: Article[];
  initialCategory?: Category | null;
  onArticleCreated?: () => void;
}

export function FullArticlesModal({ 
  isOpen, 
  onClose, 
  initialArticles,
  initialCategory,
  onArticleCreated
}: FullArticlesModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(initialCategory || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [loading, setLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('none');

  const handleAuthorClick = (authorId: string) => {
    setSelectedArticle(null);
    setSelectedAuthorId(authorId);
  };

  useEffect(() => {
    if (isOpen) {
      setArticles(initialArticles);
      setSelectedCategory(initialCategory || null);
      setSearchQuery('');
      setActiveFilter('none');
    }
  }, [isOpen, initialArticles, initialCategory]);

  const handleSearch = async () => {
    // If empty query, show all articles
    if (!searchQuery.trim()) {
      setSelectedCategory(null);
      setArticles(initialArticles);
      return;
    }
    
    if (searchQuery.trim().length < 2) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-articles', {
        body: { query: searchQuery.trim(), limit: 50 },
      });
      
      if (!error && data?.articles) {
        const mapped: Article[] = data.articles.map((a: any) => ({
          id: a.id,
          author_id: a.author_id || '',
          author: a.author ? {
            id: a.author.id,
            telegram_id: 0,
            username: a.author.username || '',
            first_name: a.author.first_name || '',
            last_name: a.author.last_name || undefined,
            avatar_url: a.author.avatar_url || undefined,
            reputation: a.author.reputation || 0,
            articles_count: 0,
            is_premium: a.author.is_premium || false,
            created_at: a.author.created_at || '',
          } : undefined,
          category_id: a.category_id || '',
          topic_id: '',
          title: a.title,
          preview: a.preview || '',
          body: a.body,
          media_url: a.media_url || undefined,
          media_type: a.media_type as 'image' | 'youtube' | undefined,
          is_anonymous: a.is_anonymous || false,
          status: (a.status || 'approved') as 'draft' | 'pending' | 'approved' | 'rejected',
          likes_count: a.likes_count || 0,
          comments_count: a.comments_count || 0,
          favorites_count: a.favorites_count || 0,
          views_count: a.views_count || 0,
          rep_score: a.rep_score || 0,
          allow_comments: a.allow_comments !== false,
          created_at: a.created_at || '',
          updated_at: a.updated_at || '',
        }));
        setArticles(mapped);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (cat: Category | null) => {
    setSelectedCategory(cat);
    setSearchQuery('');
    setActiveFilter('none');
    if (cat) {
      setArticles(initialArticles.filter(a => a.category_id === cat.id));
    } else {
      setArticles(initialArticles);
    }
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    setSearchQuery('');
    setSelectedCategory(null);
  };

  const handleArticleCreated = () => {
    setIsCreateModalOpen(false);
    onArticleCreated?.();
  };

  const handleShare = (e: React.MouseEvent, article: Article) => {
    e.stopPropagation();
    const shareUrl = `https://t.me/Man_Hub_bot/Hub?startapp=article_${article.id}`;
    const shareText = `${(article as any).topic || article.title}`;
    
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

  if (!isOpen) return null;

  // Sort and filter articles based on active filter
  let displayedArticles = selectedCategory && !searchQuery
    ? articles.filter(a => a.category_id === selectedCategory.id)
    : articles;

  // Apply sorting based on filter
  if (activeFilter === 'popular') {
    displayedArticles = [...displayedArticles].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
  } else if (activeFilter === 'verified') {
    displayedArticles = [...displayedArticles].sort((a, b) => (b.author?.reputation || 0) - (a.author?.reputation || 0));
  }

  // Sort pinned articles to top
  displayedArticles = [...displayedArticles].sort((a, b) => {
    if ((a as any).is_pinned && !(b as any).is_pinned) return -1;
    if (!(a as any).is_pinned && (b as any).is_pinned) return 1;
    return 0;
  });

  return (
    <>
      <div className="fixed inset-0 z-[100]">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-background/95 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />

        {/* Modal - Full screen */}
        <div className="absolute inset-0 flex flex-col animate-fade-in">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="flex items-center justify-between px-4 py-4">
              <h2 className="font-heading text-xl font-semibold">Все статьи</h2>
              <div className="flex items-center gap-2">
                <Button onClick={() => setIsCreateModalOpen(true)} size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Написать
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Search */}
            <div className="px-4 pb-3">
              <div className="relative">
                <button
                  onClick={handleSearch}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск статей..."
                  className="pl-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2 mt-3">
                <Button
                  variant={activeFilter === 'popular' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange(activeFilter === 'popular' ? 'none' : 'popular')}
                  className="gap-1.5"
                >
                  <Heart className="h-3.5 w-3.5" />
                  Популярные
                </Button>
                <Button
                  variant={activeFilter === 'verified' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange(activeFilter === 'verified' ? 'none' : 'verified')}
                  className="gap-1.5"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Проверенные авторы
                </Button>
              </div>
            </div>

            {/* Categories */}
            <CategoryList
              categories={mockCategories}
              selectedId={selectedCategory?.id}
              onSelect={handleCategoryChange}
              className="pb-3"
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {displayedArticles.length > 0 ? (
                  displayedArticles.map((article, index) => (
                    <button
                      key={article.id}
                      onClick={() => setSelectedArticle(article)}
                      className={cn(
                        'w-full text-left rounded-2xl bg-card p-4 transition-all duration-300 animate-slide-up hover:ring-1 hover:ring-primary/30',
                        (article as any).is_pinned && 'ring-1 ring-primary/50 bg-primary/5'
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Author Row */}
                      <div className="flex items-center gap-3 mb-3">
                        {(article as any).is_pinned && (
                          <Pin className="h-4 w-4 text-primary fill-primary flex-shrink-0" />
                        )}
                        <img
                          src={article.is_anonymous ? '/placeholder.svg' : article.author?.avatar_url || '/placeholder.svg'}
                          alt=""
                          className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
                        />
                        <span className="text-sm text-muted-foreground">
                          Rep: {article.is_anonymous ? 0 : article.author?.reputation || 0}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-lg text-foreground mb-1">
                        {article.title}
                      </h3>

                      {/* Body text */}
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {article.body.substring(0, 150)}
                      </p>

                      {/* Divider */}
                      <div className="border-t border-border pt-4">
                        {/* Actions Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Likes */}
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Heart className="h-5 w-5" />
                              <span className="text-sm">{article.likes_count}</span>
                            </div>
                            {/* Comments */}
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <MessageCircle className="h-5 w-5" />
                              <span className="text-sm">{article.comments_count}</span>
                            </div>
                            {/* Favorites */}
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Bookmark className="h-5 w-5" />
                              <span className="text-sm">{article.favorites_count}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Views */}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 text-muted-foreground">
                              <TrendingUp className="h-4 w-4" />
                              <span className="text-sm">+{article.views_count || 0}</span>
                            </div>
                            {/* Share */}
                            <Share2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="py-12 text-center text-muted-foreground">
                    Нет статей
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ArticleDetailModal
        isOpen={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
        article={selectedArticle}
        onAuthorClick={handleAuthorClick}
      />

      <PublicProfileModal
        isOpen={!!selectedAuthorId}
        onClose={() => setSelectedAuthorId(null)}
        authorId={selectedAuthorId}
      />

      <CreateArticleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleArticleCreated}
      />
    </>
  );
}