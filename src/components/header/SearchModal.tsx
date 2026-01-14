import { useState, useEffect } from 'react';
import { X, Search, Clock, TrendingUp, Loader2, ChevronDown, ChevronUp, Heart, MessageCircle, Bookmark, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { ArticleDetailModal } from '@/components/articles/ArticleDetailModal';
import { PublicProfileModal } from '@/components/profile/PublicProfileModal';
import { Article as TypeArticle } from '@/types';
import { cn } from '@/lib/utils';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchArticle {
  id: string;
  title: string;
  topic?: string | null;
  preview: string | null;
  body: string;
  author_id: string | null;
  category_id: string | null;
  media_url: string | null;
  media_type: string | null;
  is_anonymous: boolean | null;
  status: string | null;
  likes_count: number | null;
  comments_count: number | null;
  favorites_count: number | null;
  rep_score: number | null;
  allow_comments: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  author?: any;
}

const RECENT_SEARCHES_KEY = 'manhub_recent_searches';

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [results, setResults] = useState<SearchArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<TypeArticle | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);

  const handleAuthorClick = (authorId: string) => {
    setSelectedArticle(null);
    setSelectedAuthorId(authorId);
  };

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setResults([]);
      setSearched(false);
      setExpandedId(null);
    }
  }, [isOpen]);

  const handleSearch = async (query: string) => {
    // If empty query, fetch all articles
    if (!query.trim()) {
      setLoading(true);
      setSearched(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('search-articles', {
          body: { query: '', limit: 50 },
        });
        
        if (!error && data?.articles) {
          setResults(data.articles);
        } else {
          // Fallback: fetch from table directly
          const { data: articles } = await supabase
            .from('articles')
            .select(`*, author:author_id(id, first_name, last_name, username, avatar_url, is_premium, reputation)`)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(50);
          setResults(articles || []);
        }
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    if (query.trim().length < 2) return;
    
    const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    
    setLoading(true);
    setSearched(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('search-articles', {
        body: { query: query.trim(), limit: 20 },
      });
      
      if (!error && data?.articles) {
        setResults(data.articles);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRecentClick = (query: string) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const mapToArticle = (article: SearchArticle): TypeArticle => ({
    id: article.id,
    author_id: article.author_id || '',
    category_id: article.category_id || '',
    topic_id: '',
    title: article.title,
    preview: article.preview || '',
    body: article.body,
    media_url: article.media_url || undefined,
    media_type: article.media_type as 'image' | 'youtube' | undefined,
    is_anonymous: article.is_anonymous || false,
    status: (article.status || 'approved') as 'draft' | 'pending' | 'approved' | 'rejected',
    likes_count: article.likes_count || 0,
    comments_count: article.comments_count || 0,
    favorites_count: article.favorites_count || 0,
    rep_score: article.rep_score || 0,
    allow_comments: article.allow_comments !== false,
    created_at: article.created_at || '',
    updated_at: article.updated_at || '',
    author: article.author ? {
      id: article.author.id,
      telegram_id: 0,
      username: article.author.username || '',
      first_name: article.author.first_name || '',
      last_name: article.author.last_name || undefined,
      avatar_url: article.author.avatar_url || undefined,
      reputation: article.author.reputation || 0,
      articles_count: 0,
      is_premium: article.author.is_premium || false,
      created_at: article.author.created_at || '',
    } : undefined,
  });

  if (!isOpen) return null;

  const trendingTopics = [
    'Инвестиции',
    'Продуктивность',
    'Фитнес',
    'Криптовалюта',
    'Саморазвитие',
  ];

  return (
    <>
      <div className="fixed inset-0 z-[100]">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="absolute inset-x-0 top-0 bg-card animate-slide-down max-h-[85vh] overflow-y-auto">
          <div className="container py-4">
            {/* Search input */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <button
                  onClick={() => handleSearch(searchQuery)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск статей, тем..."
                  className="pl-10"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch(searchQuery);
                  }}
                />
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {/* Results - Expandable list */}
            {!loading && searched && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Статьи ({results.length})
                </h3>
                {results.length > 0 ? (
                  <div className="space-y-3">
                    {results.map((article, index) => (
                      <div
                        key={article.id}
                        className={cn(
                          'rounded-2xl bg-secondary/50 overflow-hidden transition-all duration-300',
                          expandedId === article.id ? 'ring-1 ring-primary/30' : ''
                        )}
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
                                {article.topic || article.title}
                              </h3>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{article.is_anonymous ? 'Аноним' : article.author?.first_name || 'Автор'}</span>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <Heart className="h-3 w-3" />
                                  {article.likes_count || 0}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="h-3 w-3" />
                                  {article.comments_count || 0}
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
                            {/* Title if different from topic */}
                            {article.topic && article.title && article.topic !== article.title && (
                              <h4 className="font-semibold text-foreground mb-2">{article.title}</h4>
                            )}

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
                              {article.preview || article.body.substring(0, 200)}
                            </p>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-3 border-t border-border">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Heart className="h-5 w-5" />
                                  <span className="text-sm">{article.likes_count || 0}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <MessageCircle className="h-5 w-5" />
                                  <span className="text-sm">{article.comments_count || 0}</span>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedArticle(mapToArticle(article))}
                              >
                                Открыть
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">Ничего не найдено</p>
                )}
              </div>
            )}

            {/* Recent searches */}
            {!searched && recentSearches.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Недавние запросы</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearRecent}>
                    Очистить
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((query) => (
                    <button
                      key={query}
                      onClick={() => handleRecentClick(query)}
                      className="rounded-full bg-secondary px-3 py-1.5 text-sm transition-colors hover:bg-secondary/80"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending */}
            {!searched && (
              <div className="mt-4 pb-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>Популярные темы</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trendingTopics.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => handleRecentClick(topic)}
                      className="rounded-full bg-secondary/50 px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
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
    </>
  );
}