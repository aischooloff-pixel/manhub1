import { useState, useEffect } from 'react';
import { X, Crown, Star, FileText, Calendar, ExternalLink, Globe, Flag, Package, Play, Plus, Minus, TrendingUp, TrendingDown, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ArticleDetailModal } from '@/components/articles/ArticleDetailModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useTelegram } from '@/hooks/use-telegram';
import { toast } from 'sonner';
import { Loader2, Send, CheckCircle } from 'lucide-react';
import { PodcastPlayerModal } from '@/components/podcasts/PodcastPlayerModal';
import { UserBadges, AuthorBadge } from '@/components/profile/UserBadges';
import type { Article } from '@/types';

interface ReputationHistoryEntry {
  id: string;
  value: number;
  created_at: string | null;
  from_user: {
    id: string;
    first_name: string | null;
    username: string | null;
    avatar_url: string | null;
    subscription_tier: string;
  } | null;
}

interface PublicProfile {
  id: string;
  telegram_id: number | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  reputation: number;
  subscription_tier: string;
  bio: string | null;
  telegram_channel: string | null;
  website: string | null;
  created_at: string;
  is_blocked: boolean;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  media_url: string | null;
  media_type: string | null;
  link: string | null;
}

interface PublicProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorId: string | null;
}

export function PublicProfileModal({ isOpen, onClose, authorId }: PublicProfileModalProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articleDetailOpen, setArticleDetailOpen] = useState(false);
  const [onAuthorClick, setOnAuthorClick] = useState<((id: string) => void) | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [videoToPlay, setVideoToPlay] = useState<{ id: string; title: string } | null>(null);
  const [reputationModalOpen, setReputationModalOpen] = useState(false);
  const [reputationHistory, setReputationHistory] = useState<ReputationHistoryEntry[]>([]);
  const [reputationLoading, setReputationLoading] = useState(false);
  const [giveRepOpen, setGiveRepOpen] = useState(false);
  const [giveRepSubmitting, setGiveRepSubmitting] = useState(false);
  const { getInitData } = useTelegram();

  useEffect(() => {
    if (isOpen && authorId) {
      loadProfile();
      loadArticles();
      loadProducts();
    }
  }, [isOpen, authorId]);

  const loadProducts = async () => {
    if (!authorId) return;
    
    try {
      const { data, error } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_profile_id', authorId)
        .eq('is_active', true)
        .eq('status', 'approved')
        .limit(1);
      
      if (!error && data) {
        setProducts(data as Product[]);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const extractYoutubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getYoutubeThumbnail = (url: string): string | null => {
    const videoId = extractYoutubeId(url);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
    return null;
  };

  const handlePlayVideo = (url: string, title: string) => {
    const videoId = extractYoutubeId(url);
    if (videoId) {
      setVideoToPlay({ id: videoId, title });
      setVideoPlayerOpen(true);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportReason.trim() || !authorId) {
      toast.error('Укажите причину жалобы');
      return;
    }

    const initData = getInitData();
    if (!initData) {
      toast.error('Не удалось авторизоваться');
      return;
    }

    setReportSubmitting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tg-report-user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            initData, 
            reportedUserId: authorId,
            reason: reportReason.trim() 
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка отправки');
      }

      setReportSuccess(true);
      setReportReason('');
      
      setTimeout(() => {
        setReportSuccess(false);
        setReportOpen(false);
      }, 2000);
    } catch (error) {
      console.error('Report error:', error);
      toast.error('Не удалось отправить жалобу');
    } finally {
      setReportSubmitting(false);
    }
  };

  const loadReputationHistory = async () => {
    if (!authorId) return;
    setReputationLoading(true);
    
    try {
      const initData = getInitData();
      if (!initData) {
        toast.error('Не удалось авторизоваться');
        return;
      }

      const { data, error } = await supabase.functions.invoke('tg-user-reputation', {
        body: { initData, userId: authorId },
      });

      if (!error && data) {
        setReputationHistory(data.history || []);
      }
    } catch (err) {
      console.error('Error loading reputation history:', err);
    } finally {
      setReputationLoading(false);
    }
  };

  const handleGiveRep = async (value: 1 | -1) => {
    if (!authorId) return;

    const initData = getInitData();
    if (!initData) {
      toast.error('Не удалось авторизоваться');
      return;
    }

    setGiveRepSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('tg-give-reputation', {
        body: { initData, targetUserId: authorId, value },
      });

      if (error) {
        const errorBody = await error.context?.json?.().catch(() => null);
        throw new Error(errorBody?.error || 'Ошибка');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success(value > 0 ? '+1 rep отправлено!' : '-1 rep отправлено!');
      setGiveRepOpen(false);
      
      // Refresh profile to update reputation
      loadProfile();
      if (reputationModalOpen) {
        loadReputationHistory();
      }
    } catch (error: any) {
      console.error('Give rep error:', error);
      toast.error(error.message || 'Не удалось отправить репутацию');
    } finally {
      setGiveRepSubmitting(false);
    }
  };

  const handleReputationClick = () => {
    setReputationModalOpen(true);
    loadReputationHistory();
  };

  const handleReputationAuthorClick = (userId: string) => {
    // Close reputation modal and switch to the new profile
    setReputationModalOpen(false);
    // We need to trigger a new profile open - this requires parent handling
    // For now, just close and the user can navigate
    onClose();
    // Dispatch event to open new profile
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-public-profile', { detail: { authorId: userId } }));
    }, 100);
  };

  const loadProfile = async () => {
    if (!authorId) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authorId)
        .maybeSingle();
      
      if (!error && data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadArticles = async () => {
    if (!authorId) return;
    setArticlesLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          author:profiles!articles_author_id_fkey(
            id, first_name, last_name, username, avatar_url, 
            is_premium, reputation, created_at, subscription_tier
          )
        `)
        .eq('author_id', authorId)
        .eq('status', 'approved')
        .eq('is_anonymous', false)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (!error && data) {
        setArticles(data);
      }
    } catch (err) {
      console.error('Error loading articles:', err);
    } finally {
      setArticlesLoading(false);
    }
  };

  const handleArticleClick = (article: any) => {
    setSelectedArticle(article);
    setArticleDetailOpen(true);
  };

  if (!isOpen) return null;

  const isPremium = profile?.subscription_tier === 'premium' || profile?.subscription_tier === 'plus';
  
  // Always show real user data
  const displayName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Пользователь';
  const displayUsername = profile?.username;
  const displayAvatar = profile?.avatar_url;

  const formatTelegramLink = (link: string | null) => {
    if (!link) return null;
    if (link.startsWith('@')) return link;
    if (link.includes('t.me/')) {
      const match = link.match(/t\.me\/([^/?\s]+)/);
      return match ? `@${match[1]}` : link;
    }
    return `@${link}`;
  };

  const formatWebsiteDisplay = (url: string | null) => {
    if (!url) return null;
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url.length > 25 ? url.slice(0, 25) + '...' : url;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100]">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-card animate-slide-up',
            'md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg'
          )}
        >
          {/* Handle bar for mobile */}
          <div className="sticky top-0 z-10 flex justify-center bg-card pt-3 md:hidden">
            <div className="h-1 w-12 rounded-full bg-border" />
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 h-8 w-8 z-20"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center">
                <Skeleton className="h-20 w-20 rounded-full mb-4" />
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-8 w-40" />
              </div>
            ) : profile ? (
              <>
                {/* Blocked user display */}
                {profile.is_blocked ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="h-20 w-20 rounded-full border-2 border-destructive bg-destructive/10 flex items-center justify-center mb-6">
                      <span className="text-3xl">🚫</span>
                    </div>
                    <h2 className="font-heading text-2xl font-bold text-destructive mb-2">
                      Заблокирован
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Этот пользователь заблокирован
                    </p>
                  </div>
                ) : (
                <>
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="relative mb-4">
                    {displayAvatar ? (
                      <img
                        src={displayAvatar}
                        alt={displayName}
                        className="h-20 w-20 rounded-full border-2 border-border object-cover"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full border-2 border-border bg-muted flex items-center justify-center">
                        <span className="text-2xl">👤</span>
                      </div>
                    )}
                    {isPremium && (
                      <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Crown className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  <h2 className="mb-1 font-heading text-xl font-semibold flex items-center gap-2 justify-center">
                    {isPremium && <Crown className="h-5 w-5 text-yellow-500" />}
                    {displayName}
                  </h2>
                  
                  {displayUsername && (
                    <p className="mb-2 text-sm text-muted-foreground">@{displayUsername}</p>
                  )}

                  {/* Badges - show all badges in profile */}
                  <div className="mb-3">
                    <UserBadges userProfileId={profile.id} variant="full" />
                  </div>

                  {/* Bio */}
                  {isPremium && profile.bio && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3 break-words max-w-xs">
                      {profile.bio}
                    </p>
                  )}

                  {/* Social Links - only for premium */}
                  {isPremium && (profile.telegram_channel || profile.website) && (
                    <div className="flex flex-wrap justify-center gap-2 mb-3">
                      {profile.telegram_channel && (
                        <a
                          href={profile.telegram_channel.startsWith('http') 
                            ? profile.telegram_channel 
                            : `https://t.me/${profile.telegram_channel.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {formatTelegramLink(profile.telegram_channel)}
                        </a>
                      )}
                      {profile.website && (
                        <a
                          href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
                        >
                          <Globe className="h-3 w-3" />
                          {formatWebsiteDisplay(profile.website)}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <button
                      onClick={handleReputationClick}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <Star className="h-3.5 w-3.5" />
                      <span>{profile.reputation || 0} репутации</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{articles.length} статей</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>С {new Date(profile.created_at).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Give Reputation Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={() => setGiveRepOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Дать репутацию
                  </Button>
                </div>

                {/* Products - only for Premium users */}
                {profile.subscription_tier === 'premium' && products.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-heading text-sm font-semibold mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      Продукт
                    </h3>
                    {products.map((product) => (
                      <Dialog key={product.id}>
                        <DialogTrigger asChild>
                          <button className="w-full rounded-xl border border-border p-4 text-left hover:bg-muted/50 transition-colors">
                            <h4 className="font-medium text-sm line-clamp-1">{product.title}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {product.description}
                            </p>
                            <span className="font-semibold text-primary text-sm mt-2 block">
                              {product.price.toLocaleString()} {product.currency === 'RUB' ? '₽' : product.currency === 'USD' ? '$' : '€'}
                            </span>
                          </button>
                        </DialogTrigger>
                        <DialogContent className="z-[200] max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Package className="h-5 w-5 text-primary" />
                              {product.title}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {product.media_url && (
                              <div 
                                className="w-full h-48 rounded-lg bg-secondary overflow-hidden cursor-pointer"
                                onClick={() => {
                                  if (product.media_type === 'youtube' && product.media_url) {
                                    handlePlayVideo(product.media_url, product.title);
                                  }
                                }}
                              >
                                {product.media_type === 'youtube' ? (
                                  <div className="w-full h-full relative group">
                                    <img
                                      src={getYoutubeThumbnail(product.media_url!) || ''}
                                      alt={product.title}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                                      <Play className="h-10 w-10 text-white" fill="white" />
                                    </div>
                                  </div>
                                ) : (
                                  <img
                                    src={product.media_url}
                                    alt={product.title}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                            )}
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {product.description}
                            </p>
                            <div className="flex items-center justify-between pt-2 border-t border-border">
                              <span className="font-bold text-xl text-primary">
                                {product.price.toLocaleString()} {product.currency === 'RUB' ? '₽' : product.currency === 'USD' ? '$' : '€'}
                              </span>
                              <Button className="flex items-center gap-2">
                                <ShoppingBag className="h-4 w-4" />
                                Купить
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                )}

                {/* Articles */}
                <div className="mb-6">
                  <h3 className="font-heading text-sm font-semibold mb-3">Статьи автора</h3>
                  
                  {articlesLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : articles.length > 0 ? (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {articles.map((article) => (
                        <button
                          key={article.id}
                          onClick={() => handleArticleClick(article)}
                          className="w-full text-left p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <h4 className="font-medium text-sm line-clamp-1 mb-1">
                            {article.topic || article.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {article.preview}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <span>❤️</span> {article.likes_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <span>💬</span> {article.comments_count || 0}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      У автора пока нет публичных статей
                    </p>
                  )}
                </div>

                {/* Report Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-destructive"
                  onClick={() => setReportOpen(true)}
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Пожаловаться на пользователя
                </Button>
                </>
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground">Профиль не найден</p>
            )}
          </div>
        </div>
      </div>

      {/* Article Detail Modal */}
      <ArticleDetailModal
        isOpen={articleDetailOpen}
        onClose={() => setArticleDetailOpen(false)}
        article={selectedArticle}
      />

      {/* Video Player Modal */}
      <PodcastPlayerModal
        isOpen={videoPlayerOpen}
        onClose={() => setVideoPlayerOpen(false)}
        podcast={videoToPlay ? {
          id: videoToPlay.id,
          title: videoToPlay.title,
          youtube_id: videoToPlay.id,
          youtube_url: `https://youtube.com/watch?v=${videoToPlay.id}`,
          description: '',
          thumbnail_url: '',
        } : null}
      />

      {/* Report Modal */}
      <Dialog open={reportOpen} onOpenChange={(open) => {
        if (!reportSubmitting) {
          setReportOpen(open);
          if (!open) {
            setReportReason('');
            setReportSuccess(false);
          }
        }
      }}>
        <DialogContent className="max-w-md z-[150]">
          <DialogHeader>
            <DialogTitle>Пожаловаться на пользователя</DialogTitle>
          </DialogHeader>

          {reportSuccess ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Жалоба отправлена!</h3>
              <p className="text-sm text-muted-foreground">
                Мы рассмотрим вашу жалобу в ближайшее время
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Опишите причину жалобы на пользователя {displayUsername ? `@${displayUsername}` : displayName}
              </p>

              <Textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Укажите причину жалобы..."
                rows={5}
                disabled={reportSubmitting}
                className="resize-none"
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setReportOpen(false)}
                  disabled={reportSubmitting}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleReportSubmit}
                  disabled={reportSubmitting || !reportReason.trim()}
                  className="flex-1 gap-2"
                  variant="destructive"
                >
                  {reportSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Отправить
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reputation History Modal */}
      <Dialog open={reputationModalOpen} onOpenChange={setReputationModalOpen}>
        <DialogContent className="max-h-[85vh] max-w-md p-0 z-[150]">
          <DialogHeader className="px-4 pt-4 pr-12">
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              История репутации
            </DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto px-4 pb-4">
            {reputationLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : reputationHistory.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                История репутации пуста
              </p>
            ) : (
              <div className="space-y-3">
                {reputationHistory.map((entry) => {
                  const fromUser = entry.from_user;
                  const displayName = fromUser?.first_name || 'Пользователь';
                  const displayAvatar = fromUser?.avatar_url;
                  
                  return (
                    <div 
                      key={entry.id} 
                      className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3"
                    >
                      <button
                        onClick={() => fromUser?.id && handleReputationAuthorClick(fromUser.id)}
                        className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        disabled={!fromUser?.id}
                      >
                        {displayAvatar ? (
                          <img
                            src={displayAvatar}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-sm">👤</span>
                          </div>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => fromUser?.id && handleReputationAuthorClick(fromUser.id)}
                          className="text-sm font-medium hover:text-primary transition-colors text-left"
                          disabled={!fromUser?.id}
                        >
                          {displayName}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {entry.created_at 
                            ? new Date(entry.created_at).toLocaleDateString('ru-RU', { 
                                day: 'numeric', 
                                month: 'short' 
                              })
                            : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {entry.value > 0 ? (
                          <>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="font-bold text-green-500">+{entry.value}</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            <span className="font-bold text-red-500">{entry.value}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Give Reputation Modal */}
      <Dialog open={giveRepOpen} onOpenChange={setGiveRepOpen}>
        <DialogContent className="max-w-sm z-[150]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Дать репутацию
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Выберите действие. Вы можете изменять репутацию одному пользователю раз в 24 часа.
            </p>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleGiveRep(-1)}
                disabled={giveRepSubmitting}
                className="flex-1 gap-2 border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-500"
              >
                {giveRepSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Minus className="h-4 w-4" />
                    -1 rep
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleGiveRep(1)}
                disabled={giveRepSubmitting}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              >
                {giveRepSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    +1 rep
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
