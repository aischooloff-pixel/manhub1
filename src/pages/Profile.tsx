import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ArticleListCard } from '@/components/articles/ArticleListCard';
import { ArticleDetailModal } from '@/components/articles/ArticleDetailModal';
import { EditArticleModal } from '@/components/articles/EditArticleModal';
import { SettingsModal } from '@/components/profile/SettingsModal';
import { PremiumModal } from '@/components/profile/PremiumModal';
import { UserArticlesModal } from '@/components/profile/UserArticlesModal';
import { ReputationHistoryModal } from '@/components/profile/ReputationHistoryModal';
import { SocialLinksModal } from '@/components/profile/SocialLinksModal';
import { SupportModal } from '@/components/profile/SupportModal';
import { ProductsModal } from '@/components/profile/ProductsModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Crown, FileText, Bookmark, History, Star, Send, Globe, HelpCircle, MessageCircle, Heart, MessageSquare, PenLine, Trash2, Package } from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { useArticles, Article } from '@/hooks/use-articles';
import { useReputation } from '@/hooks/use-reputation';
import { useTelegram } from '@/hooks/use-telegram';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Article as TypeArticle } from '@/types';

interface ActivityItem {
  id: string;
  type: 'like' | 'comment' | 'article_created' | 'article_updated' | 'article_deleted';
  article_id: string;
  article_title: string;
  article_topic?: string;
  created_at: string;
  details?: string;
}

export default function Profile() {
  const { profile, loading: profileLoading, error: profileError, articlesCount, updateSocialLinks, refetch } = useProfile();
  const { getUserArticles, updateArticle, deleteArticle } = useArticles();
  const { getMyReputation } = useReputation();
  const { openTelegramLink, getBotUsername, webApp } = useTelegram();
  const [activeTab, setActiveTab] = useState('articles');
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPremiumOpen, setIsPremiumOpen] = useState(false);
  const [isArticlesOpen, setIsArticlesOpen] = useState(false);
  const [isRepHistoryOpen, setIsRepHistoryOpen] = useState(false);
  const [isSocialLinksOpen, setIsSocialLinksOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [userArticles, setUserArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [reputation, setReputation] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState<TypeArticle | null>(null);
  const [editingArticle, setEditingArticle] = useState<TypeArticle | null>(null);
  const [favoriteArticles, setFavoriteArticles] = useState<Article[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // Listen for tab switch events from side menu
  useEffect(() => {
    const handleTabSwitch = (e: CustomEvent) => {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    };
    
    window.addEventListener('switch-profile-tab', handleTabSwitch as EventListener);
    return () => {
      window.removeEventListener('switch-profile-tab', handleTabSwitch as EventListener);
    };
  }, []);

  // Load user's articles
  useEffect(() => {
    const loadArticles = async () => {
      setArticlesLoading(true);
      const articles = await getUserArticles();
      setUserArticles(articles);
      setArticlesLoading(false);
    };
    loadArticles();
  }, [getUserArticles]);

  // Load favorites
  useEffect(() => {
    const loadFavorites = async () => {
      if (!profile?.id) return;
      setFavoritesLoading(true);
      try {
        const { data, error } = await supabase
          .from('article_favorites')
          .select(`
            article_id,
            articles:article_id(
              *,
              author:author_id(id, first_name, last_name, username, avatar_url, is_premium, reputation, show_avatar, show_name, show_username, created_at)
            )
          `)
          .eq('user_profile_id', profile.id);
        
        if (!error && data) {
          const articles = data
            .map((f: any) => f.articles)
            .filter((a: any) => a && a.status === 'approved') as Article[];
          setFavoriteArticles(articles);
        }
      } catch (err) {
        console.error('Error loading favorites:', err);
      }
      setFavoritesLoading(false);
    };
    loadFavorites();
  }, [profile?.id]);

  // Load activities
  useEffect(() => {
    const loadActivities = async () => {
      if (!webApp?.initData) return;
      setActivitiesLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('tg-my-activity', {
          body: { initData: webApp.initData, limit: 50 },
        });
        if (!error && data?.activities) {
          setActivities(data.activities);
        }
      } catch (err) {
        console.error('Error loading activities:', err);
      }
      setActivitiesLoading(false);
    };
    loadActivities();
  }, [webApp?.initData]);

  // Load reputation
  useEffect(() => {
    const loadRep = async () => {
      const { reputation: rep } = await getMyReputation();
      setReputation(rep);
    };
    loadRep();
  }, [getMyReputation]);

  const handleSaveSocialLinks = async (telegram: string, website: string) => {
    const success = await updateSocialLinks(telegram, website);
    if (success) {
      toast.success('Социальные ссылки обновлены');
      setIsSocialLinksOpen(false);
    } else {
      toast.error('Ошибка сохранения');
    }
  };

  const handleEditArticle = async (articleId: string, updates: any) => {
    const success = await updateArticle(articleId, updates);
    if (success) {
      const data = await getUserArticles();
      setUserArticles(data);
    }
    return success;
  };

  const handleDeleteArticle = async (articleId: string) => {
    const success = await deleteArticle(articleId);
    if (success) {
      const data = await getUserArticles();
      setUserArticles(data);
    }
  };

  // Convert Article to the format expected by ArticleListCard
  const mapArticleToListFormat = (article: Article) => ({
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
    status: (article.status || 'pending') as 'draft' | 'pending' | 'approved' | 'rejected',
    rejection_reason: article.rejection_reason || undefined,
    likes_count: article.likes_count || 0,
    comments_count: article.comments_count || 0,
    favorites_count: article.favorites_count || 0,
    rep_score: article.rep_score || 0,
    allow_comments: article.allow_comments !== false,
    created_at: article.created_at || '',
    updated_at: article.updated_at || '',
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-500">Опубликовано</span>;
      case 'pending':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500">На модерации</span>;
      case 'rejected':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-500">Отклонено</span>;
      default:
        return null;
    }
  };

  // Display values respecting privacy settings
  const displayName = profile?.show_name !== false 
    ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Пользователь'
    : 'Аноним';
  
  const displayUsername = profile?.show_username !== false 
    ? profile?.username || 'user'
    : 'скрыт';
  
  const displayAvatar = profile?.show_avatar !== false
    ? profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || profile?.first_name}`
    : `https://api.dicebear.com/7.x/shapes/svg?seed=${profile?.id}`;

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-16">
        <Header />
        <main className="py-6 px-4">
          <div className="flex items-start gap-4 mb-6">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-16">
        <Header />
        <main className="py-6 px-4">
          <div className="text-center py-12 space-y-4">
            <p className="text-muted-foreground">
              {profileError ? `Ошибка авторизации: ${profileError}` : 'Откройте приложение через Telegram бота для авторизации'}
            </p>
            <Button variant="outline" onClick={refetch}>
              Повторить
            </Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // Blocked user modal
  if (profile.is_blocked) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/20 flex items-center justify-center">
            <span className="text-4xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-destructive mb-4">Аккаунт заблокирован</h1>
          <p className="text-muted-foreground mb-2">Вы не можете использовать ManHub.</p>
          <p className="text-sm text-muted-foreground">Если вы считаете, что это ошибка, обратитесь в поддержку.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-16">
      <Header />

      <main className="py-6">
        {/* Profile Header */}
        <section className="mb-6 px-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              <img
                src={displayAvatar}
                alt={displayName}
                className="h-20 w-20 rounded-full object-cover"
              />
              {profile.is_premium && (
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <Crown className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="font-heading text-xl font-bold">{displayName}</h1>
              <p className="text-sm text-muted-foreground">@{displayUsername}</p>
              <div className="mt-2 flex items-center gap-4">
                <button
                  onClick={() => setIsRepHistoryOpen(true)}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Star className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{reputation} rep</span>
                </button>
                <button
                  onClick={() => setIsArticlesOpen(true)}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground hover:text-primary">
                    {userArticles.length} статей
                  </span>
                </button>
              </div>

              {/* Social Links for Premium Users */}
              {profile.is_premium && (
                <div className="mt-3 flex items-center gap-3">
                  {profile.telegram_channel && (
                    <a
                      href={
                        profile.telegram_channel.startsWith('@')
                          ? `https://t.me/${profile.telegram_channel.slice(1)}`
                          : profile.telegram_channel
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Send className="h-3 w-3" />
                      <span>{profile.telegram_channel}</span>
                    </a>
                  )}
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Globe className="h-3 w-3" />
                      <span className="max-w-[120px] truncate">{profile.website.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                  <button onClick={() => setIsSocialLinksOpen(true)} className="text-xs text-primary hover:underline">
                    Изменить
                  </button>
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>

          {/* Products Button for Premium users */}
          {profile.subscription_tier === 'premium' && (
            <Button
              variant="outline"
              className="w-full mt-4 gap-2"
              onClick={() => setIsProductsOpen(true)}
            >
              <Package className="h-4 w-4" />
              Мои продукты
            </Button>
          )}
        </section>

        {/* Premium Banner */}
        {!profile.is_premium && (
          <section className="mb-6 px-4">
            <button
              onClick={() => setIsPremiumOpen(true)}
              className="w-full rounded-2xl bg-gradient-to-r from-card to-card-foreground/5 p-4 text-left transition-all hover:from-card/80"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-sm font-semibold">Перейти на Premium</h3>
                  <p className="text-xs text-muted-foreground">Безлимитные публикации и приоритетная модерация</p>
                </div>
              </div>
            </button>
          </section>
        )}

        {/* Tabs */}
        <section className="px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="articles" className="flex-1 gap-2">
                <FileText className="h-4 w-4" />
                Статьи
              </TabsTrigger>
              <TabsTrigger value="favorites" className="flex-1 gap-2">
                <Bookmark className="h-4 w-4" />
                Избранное
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex-1 gap-2">
                <History className="h-4 w-4" />
                Активность
              </TabsTrigger>
            </TabsList>

            <TabsContent value="articles">
              <div className="rounded-2xl bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-heading text-lg font-semibold">Мои статьи</h2>
                  {userArticles.length > 3 && (
                    <Button variant="ghost" size="sm" onClick={() => setIsArticlesOpen(true)}>
                      Все
                    </Button>
                  )}
                </div>
                {articlesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userArticles.length > 0 ? (
                      userArticles.slice(0, 5).map((article, index) => (
                        <div
                          key={article.id}
                          className="animate-slide-up"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium truncate flex-1">{article.title}</span>
                            {getStatusBadge(article.status)}
                          </div>
                          {article.status === 'rejected' && article.rejection_reason && (
                            <p className="text-xs text-red-400 mb-2">Причина: {article.rejection_reason}</p>
                          )}
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {article.preview || article.body.substring(0, 100)}
                          </p>
                          <hr className="mt-3 border-border/50" />
                        </div>
                      ))
                    ) : (
                      <p className="py-8 text-center text-muted-foreground">У вас пока нет статей</p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="favorites">
              <div className="rounded-2xl bg-card p-4">
                <h2 className="mb-4 font-heading text-lg font-semibold">Избранное</h2>
                {favoritesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                  </div>
                ) : favoriteArticles.length > 0 ? (
                  <div className="space-y-3">
                    {favoriteArticles.map((article, index) => (
                      <div
                        key={article.id}
                        className="animate-slide-up cursor-pointer"
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => setSelectedArticle(mapArticleToListFormat(article))}
                      >
                        <span className="text-sm font-medium truncate block">{article.title}</span>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {article.preview || article.body.substring(0, 100)}
                        </p>
                        <hr className="mt-3 border-border/50" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">Избранных статей пока нет</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <div className="rounded-2xl bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-heading text-lg font-semibold">История активности</h2>
                  {activities.length > 3 && !showAllActivities && (
                    <Button variant="ghost" size="sm" onClick={() => setShowAllActivities(true)}>
                      Смотреть все
                    </Button>
                  )}
                  {showAllActivities && activities.length > 3 && (
                    <Button variant="ghost" size="sm" onClick={() => setShowAllActivities(false)}>
                      Скрыть
                    </Button>
                  )}
                </div>
                {activitiesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                  </div>
                ) : activities.length > 0 ? (
                  <div className="space-y-3">
                    {(showAllActivities ? activities : activities.slice(0, 3)).map((activity, index) => (
                      <div
                        key={activity.id}
                        className="animate-slide-up flex items-start gap-3 p-3 rounded-lg bg-secondary/30"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {activity.type === 'like' && (
                            <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
                              <Heart className="h-4 w-4 text-red-500" />
                            </div>
                          )}
                          {activity.type === 'comment' && (
                            <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <MessageSquare className="h-4 w-4 text-blue-500" />
                            </div>
                          )}
                          {activity.type === 'article_created' && (
                            <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-green-500" />
                            </div>
                          )}
                          {activity.type === 'article_updated' && (
                            <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                              <PenLine className="h-4 w-4 text-yellow-500" />
                            </div>
                          )}
                          {activity.type === 'article_deleted' && (
                            <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {activity.type === 'like' && 'Лайк'}
                            {activity.type === 'comment' && 'Комментарий'}
                            {activity.type === 'article_created' && 'Публикация статьи'}
                            {activity.type === 'article_updated' && 'Редактирование статьи'}
                            {activity.type === 'article_deleted' && 'Удаление статьи'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {activity.article_topic || activity.article_title}
                          </p>
                          {activity.details && activity.type === 'comment' && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">«{activity.details}»</p>
                          )}
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {new Date(activity.created_at).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">История пуста</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Support Section */}
          <div className="mt-6 rounded-2xl bg-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading text-base font-semibold">Техническая поддержка</h3>
                <p className="text-xs text-muted-foreground">Есть вопрос? Мы поможем!</p>
              </div>
            </div>
            <Button 
              onClick={() => setIsSupportOpen(true)} 
              className="w-full gap-2"
              variant="outline"
            >
              <MessageCircle className="h-4 w-4" />
              Задать вопрос
            </Button>
          </div>
        </section>
      </main>

      <BottomNav />

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <PremiumModal isOpen={isPremiumOpen} onClose={() => setIsPremiumOpen(false)} />
      <UserArticlesModal
        isOpen={isArticlesOpen}
        onClose={() => setIsArticlesOpen(false)}
        articles={userArticles.map(mapArticleToListFormat)}
        onArticleClick={(a) => { setIsArticlesOpen(false); setSelectedArticle(a); }}
        onEditClick={(a) => { setIsArticlesOpen(false); setEditingArticle(a); }}
        onDeleteClick={handleDeleteArticle}
      />
      <EditArticleModal
        isOpen={!!editingArticle}
        onClose={() => setEditingArticle(null)}
        article={editingArticle}
        onSave={handleEditArticle}
      />
      <ArticleDetailModal
        isOpen={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
        article={selectedArticle}
      />
      <ReputationHistoryModal isOpen={isRepHistoryOpen} onClose={() => setIsRepHistoryOpen(false)} />
      <SocialLinksModal
        isOpen={isSocialLinksOpen}
        onClose={() => setIsSocialLinksOpen(false)}
        initialTelegram={profile.telegram_channel || ''}
        initialWebsite={profile.website || ''}
        onSave={handleSaveSocialLinks}
      />
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
      {profile && (
        <ProductsModal 
          isOpen={isProductsOpen} 
          onClose={() => setIsProductsOpen(false)} 
          userProfileId={profile.id} 
        />
      )}
    </div>
  );
}
