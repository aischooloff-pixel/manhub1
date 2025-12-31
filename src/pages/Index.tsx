import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ArticleCarousel } from '@/components/articles/ArticleCarousel';
import { PodcastCarousel } from '@/components/podcasts/PodcastCarousel';
import { PlaylistsSection } from '@/components/playlists/PlaylistsSection';
import { PremiumBanner } from '@/components/premium/PremiumBanner';
import { CategoryList } from '@/components/categories/CategoryList';
import { TelegramCTA } from '@/components/cta/TelegramCTA';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { ArticleDetailModal } from '@/components/articles/ArticleDetailModal';
import { PremiumModal } from '@/components/profile/PremiumModal';
import { WelcomeModal, useWelcomeModal } from '@/components/welcome/WelcomeModal';
import { AIAssistantSection } from '@/components/ai/AIAssistantSection';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { Skeleton } from '@/components/ui/skeleton';
import { mockCategories } from '@/data/mockData';
import { Category, Article as ArticleType } from '@/types';
import { useProfile } from '@/hooks/use-profile';
import { useArticles, Article } from '@/hooks/use-articles';

export default function Index() {
  const { profile, loading: profileLoading, isAdmin } = useProfile();
  const { getApprovedArticles } = useArticles();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isPremiumOpen, setIsPremiumOpen] = useState(false);
  const { showWelcome, closeWelcome } = useWelcomeModal();
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<ArticleType | null>(null);
  const [isArticleDetailOpen, setIsArticleDetailOpen] = useState(false);

  const handleArticleClick = (article: Article) => {
    // Convert to ArticleType for the modal
    const articleForModal: ArticleType = {
      id: article.id,
      author_id: article.author_id || '',
      author: article.author && !article.is_anonymous ? {
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
      category_id: article.category_id || '',
      topic_id: '',
      topic: article.topic || undefined,
      title: article.title,
      preview: article.preview || '',
      body: article.body,
      media_url: article.media_url || undefined,
      media_type: article.media_type as 'image' | 'youtube' | undefined,
      is_anonymous: article.is_anonymous || false,
      status: (article.status || 'pending') as 'draft' | 'pending' | 'approved' | 'rejected',
      likes_count: article.likes_count || 0,
      comments_count: article.comments_count || 0,
      favorites_count: article.favorites_count || 0,
      rep_score: article.rep_score || 0,
      allow_comments: article.allow_comments !== false,
      sources: article.sources || undefined,
      created_at: article.created_at || '',
      updated_at: article.updated_at || '',
    };
    setSelectedArticle(articleForModal);
    setIsArticleDetailOpen(true);
  };

  // Load articles
  useEffect(() => {
    const loadArticles = async () => {
      setArticlesLoading(true);
      const data = await getApprovedArticles(20);
      setArticles(data);
      setArticlesLoading(false);
    };
    loadArticles();
  }, [getApprovedArticles]);

  // Listen for open-article-detail event from notifications
  useEffect(() => {
    const handleOpenArticle = (e: CustomEvent<{ articleId: string }>) => {
      const article = articles.find(a => a.id === e.detail.articleId);
      if (article) {
        handleArticleClick(article);
      }
    };

    window.addEventListener('open-article-detail', handleOpenArticle as EventListener);
    return () => {
      window.removeEventListener('open-article-detail', handleOpenArticle as EventListener);
    };
  }, [articles]);

  // Sort by likes descending for "Популярное"
  const featuredArticles = [...articles]
    .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
    .slice(0, 4);
  
  const latestArticles = articles.slice(0, 10);

  const filteredArticles = selectedCategory
    ? latestArticles.filter((a) => a.category_id === selectedCategory.id)
    : latestArticles;

  const userName = profile?.first_name || 'друг';
  const isPremium = profile?.is_premium || false;
  const subscriptionTier = profile?.subscription_tier || 'free';

  // Helper to apply privacy settings (admins see original data)
  const getAuthorDisplay = (author: Article['author']) => {
    if (!author) return undefined;
    
    // Admins see original data regardless of privacy settings
    if (isAdmin) {
      return {
        id: author.id,
        telegram_id: 0,
        username: author.username || '',
        first_name: author.first_name || '',
        last_name: author.last_name || undefined,
        avatar_url: author.avatar_url || undefined,
        reputation: author.reputation || 0,
        articles_count: 0,
        is_premium: author.is_premium || false,
        created_at: '',
      };
    }
    
    // Regular users see privacy-filtered data
    return {
      id: author.id,
      telegram_id: 0,
      username: author.show_username !== false ? author.username || '' : '',
      first_name: author.show_name !== false ? author.first_name || '' : 'Аноним',
      last_name: author.show_name !== false ? author.last_name || undefined : undefined,
      avatar_url:
        author.show_avatar !== false
          ? author.avatar_url || undefined
          : `https://api.dicebear.com/7.x/shapes/svg?seed=${author.id}`,
      reputation: author.reputation || 0,
      articles_count: 0,
      is_premium: author.is_premium || false,
      created_at: '',
    };
  };

  if (profile?.is_blocked) {
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
        {/* Welcome Section */}
        <section className="mb-8 px-4">
          {profileLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-64" />
            </div>
          ) : (
            <>
              <h1 className="mb-2 font-heading text-2xl font-bold">
                Привет, {userName}
              </h1>
              <p className="text-muted-foreground">
                Что нового в сообществе сегодня
              </p>
            </>
          )}
        </section>

        {/* Categories */}
        <CategoryList
          categories={mockCategories}
          selectedId={selectedCategory?.id}
          onSelect={setSelectedCategory}
          className="mb-8"
        />

        {/* Featured Articles */}
        {articlesLoading ? (
          <section className="mb-8 px-4">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-48 w-64 flex-shrink-0 rounded-xl" />
              ))}
            </div>
          </section>
        ) : (() => {
          // Filter articles by selected category for "Популярное" section
          const categoryFilteredArticles = selectedCategory
            ? articles.filter((a) => a.category_id === selectedCategory.id)
            : articles;
          
          const displayedFeaturedArticles = [...categoryFilteredArticles]
            .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
            .slice(0, 4);

          return displayedFeaturedArticles.length > 0 ? (
          <ArticleCarousel
            title={selectedCategory ? selectedCategory.name : "Популярное"}
            articles={displayedFeaturedArticles.map(a => ({
              id: a.id,
              author_id: a.author_id || '',
              author: (a.is_anonymous && !isAdmin) ? undefined : getAuthorDisplay(a.author),
              category_id: a.category_id || '',
              topic_id: '',
              topic: a.topic || undefined,
              title: a.title,
              preview: a.preview || '',
              body: a.body,
              media_url: a.media_url || undefined,
              media_type: a.media_type as 'image' | 'youtube' | undefined,
              is_anonymous: a.is_anonymous || false,
              status: (a.status || 'pending') as 'draft' | 'pending' | 'approved' | 'rejected',
              likes_count: a.likes_count || 0,
              comments_count: a.comments_count || 0,
              favorites_count: a.favorites_count || 0,
              rep_score: a.rep_score || 0,
              allow_comments: a.allow_comments !== false,
              sources: a.sources || undefined,
              created_at: a.created_at || '',
              updated_at: a.updated_at || '',
            }))}
            onArticleClick={(a) => {
              // Convert types for modal
              setSelectedArticle(a);
              setIsArticleDetailOpen(true);
            }}
            className="mb-8"
          />
        ) : null;
        })()}

        {/* Podcasts */}
        <PodcastCarousel
          title="Подкасты"
          className="mb-8"
        />

        {/* Playlists */}
        <PlaylistsSection className="mb-8" />

        {/* AI Assistant - always visible, access controlled by subscription */}
        <AIAssistantSection className="mb-8" subscriptionTier={subscriptionTier} />

        {/* Premium Banner */}
        {!isPremium && (
          <PremiumBanner 
            className="mb-8" 
            onClick={() => setIsPremiumOpen(true)}
          />
        )}

        {/* Latest Articles */}
        <section className="mb-8 px-4">
          <h2 className="mb-4 font-heading text-xl font-semibold">
            Последние статьи
          </h2>
          {articlesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredArticles.length > 0 ? (
            <div className="space-y-4">
              {filteredArticles.map((article, index) => (
                <ArticleCard
                  key={article.id}
                  onClick={() => handleArticleClick(article)}
                  article={{
                    id: article.id,
                    author_id: article.author_id || '',
                    author: (article.is_anonymous && !isAdmin) ? undefined : getAuthorDisplay(article.author),
                    category_id: article.category_id || '',
                    topic_id: '',
                    topic: article.topic || undefined,
                    title: article.title,
                    preview: article.preview || '',
                    body: article.body,
                    media_url: article.media_url || undefined,
                    media_type: article.media_type as 'image' | 'youtube' | undefined,
                    is_anonymous: article.is_anonymous || false,
                    status: (article.status || 'pending') as 'draft' | 'pending' | 'approved' | 'rejected',
                    likes_count: article.likes_count || 0,
                    comments_count: article.comments_count || 0,
                    favorites_count: article.favorites_count || 0,
                    rep_score: article.rep_score || 0,
                    allow_comments: article.allow_comments !== false,
                    sources: article.sources || undefined,
                    created_at: article.created_at || '',
                    updated_at: article.updated_at || '',
                  }}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>Пока нет опубликованных статей</p>
              <p className="text-sm mt-2">Будьте первым, кто напишет статью!</p>
            </div>
          )}
        </section>

        {/* Reviews Section */}
        <ReviewsSection className="mb-8" />

        {/* Telegram CTA */}
        <TelegramCTA className="mb-8" />
      </main>

      <BottomNav />
      
      <PremiumModal isOpen={isPremiumOpen} onClose={() => setIsPremiumOpen(false)} />
      
      <ArticleDetailModal
        isOpen={isArticleDetailOpen}
        onClose={() => setIsArticleDetailOpen(false)}
        article={selectedArticle}
      />
      
      {showWelcome && <WelcomeModal onClose={closeWelcome} />}
    </div>
  );
}
