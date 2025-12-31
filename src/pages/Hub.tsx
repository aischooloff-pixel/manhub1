import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { CategoryList } from '@/components/categories/CategoryList';
import { ArticleListCard } from '@/components/articles/ArticleListCard';
import { CreateArticleModal } from '@/components/articles/CreateArticleModal';
import { EditArticleModal } from '@/components/articles/EditArticleModal';
import { UserArticlesModal } from '@/components/profile/UserArticlesModal';
import { AllArticlesModal } from '@/components/articles/AllArticlesModal';
import { ArticleDetailModal } from '@/components/articles/ArticleDetailModal';
import { UpgradeToPlusModal } from '@/components/profile/UpgradeToPlusModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ChevronRight, FileText } from 'lucide-react';
import { mockCategories } from '@/data/mockData';
import { Category, Article } from '@/types';
import { useArticles, Article as HookArticle } from '@/hooks/use-articles';
import { useProfile } from '@/hooks/use-profile';
import { toast } from 'sonner';

export default function Hub() {
  const { getApprovedArticles, getUserArticles, updateArticle, deleteArticle } = useArticles();
  const { profile, isAdmin } = useProfile();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMyArticlesOpen, setIsMyArticlesOpen] = useState(false);
  const [isAllArticlesOpen, setIsAllArticlesOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const [allArticles, setAllArticles] = useState<HookArticle[]>([]);
  const [myArticles, setMyArticles] = useState<HookArticle[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingMy, setLoadingMy] = useState(true);

  // Load all approved articles
  useEffect(() => {
    const load = async () => {
      setLoadingAll(true);
      const data = await getApprovedArticles(50);
      setAllArticles(data);
      setLoadingAll(false);
    };
    load();
  }, [getApprovedArticles]);

  // Load my articles
  useEffect(() => {
    const load = async () => {
      setLoadingMy(true);
      const data = await getUserArticles();
      setMyArticles(data);
      setLoadingMy(false);
    };
    load();
  }, [getUserArticles]);

  const filteredArticles = selectedCategory
    ? allArticles.filter((a) => a.category_id === selectedCategory.id)
    : allArticles;

  const getAuthorDisplay = (author: HookArticle['author']) => {
    if (!author) return undefined;
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
        created_at: author.created_at || '',
      };
    }
    return {
      id: author.id,
      telegram_id: 0,
      username: author.show_username !== false ? author.username || '' : '',
      first_name: author.show_name !== false ? author.first_name || '' : 'Аноним',
      last_name: author.show_name !== false ? author.last_name || undefined : undefined,
      avatar_url: author.show_avatar !== false ? author.avatar_url || undefined : `https://api.dicebear.com/7.x/shapes/svg?seed=${author.id}`,
      reputation: author.reputation || 0,
      articles_count: 0,
      is_premium: author.is_premium || false,
      created_at: author.created_at || '',
    };
  };

  const mapArticle = (article: HookArticle): Article => ({
    id: article.id,
    author_id: article.author_id || '',
    author: (article.is_anonymous && !isAdmin) ? undefined : getAuthorDisplay(article.author),
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
    sources: article.sources || undefined,
    created_at: article.created_at || '',
    updated_at: article.updated_at || '',
  });

  const handleArticleCreated = async () => {
    const data = await getUserArticles();
    setMyArticles(data);
  };

  const handleEditArticle = async (articleId: string, updates: any) => {
    const success = await updateArticle(articleId, updates);
    if (success) {
      const data = await getUserArticles();
      setMyArticles(data);
    }
    return success;
  };

  const handleDeleteArticle = async (articleId: string) => {
    const success = await deleteArticle(articleId);
    if (success) {
      const data = await getUserArticles();
      setMyArticles(data);
    }
  };

  if (profile?.is_blocked) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/20 flex items-center justify-center">
            <span className="text-4xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-destructive mb-4">Аккаунт заблокирован</h1>
          <p className="text-muted-foreground">Вы не можете использовать ManHub.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-16">
      <Header />
      <main className="py-6">
        <section className="mb-6 flex items-center justify-between px-4">
          <h1 className="font-heading text-2xl font-bold">Хаб</h1>
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Написать
          </Button>
        </section>

        <CategoryList categories={mockCategories} selectedId={selectedCategory?.id} onSelect={setSelectedCategory} className="mb-6" />

        <section className="mb-6 px-4">
          <div className="rounded-2xl bg-card p-4">
            <h2 className="mb-4 font-heading text-lg font-semibold">Статьи</h2>
            {loadingAll ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
            ) : (
              <div className="space-y-3">
                {filteredArticles.length > 0 ? filteredArticles.slice(0, 5).map((article) => (
                  <ArticleListCard key={article.id} article={mapArticle(article)} onClick={() => setSelectedArticle(mapArticle(article))} />
                )) : <p className="py-8 text-center text-muted-foreground">Нет статей</p>}
              </div>
            )}
            {filteredArticles.length > 5 && (
              <Button variant="outline" className="mt-4 w-full gap-2" onClick={() => setIsAllArticlesOpen(true)}>
                Смотреть все <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </section>

        <section className="px-4">
          <div className="rounded-2xl bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">Мои статьи</h2>
              {myArticles.length > 0 && (
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => setIsMyArticlesOpen(true)}>
                  Все <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
            {loadingMy ? (
              <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            ) : myArticles.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">Вы ничего не написали</p>
                <Button variant="outline" className="mt-4 gap-2" onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Написать статью
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myArticles.slice(0, 3).map((article) => (
                  <ArticleListCard key={article.id} article={mapArticle(article)} showStatus onClick={() => setSelectedArticle(mapArticle(article))} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <BottomNav />

      <CreateArticleModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={handleArticleCreated}
        onDailyLimitReached={() => setIsUpgradeOpen(true)}
      />
      <EditArticleModal isOpen={!!editingArticle} onClose={() => setEditingArticle(null)} article={editingArticle} onSave={handleEditArticle} />
      <UserArticlesModal
        isOpen={isMyArticlesOpen}
        onClose={() => setIsMyArticlesOpen(false)}
        articles={myArticles.map(mapArticle)}
        onArticleClick={(a) => { setIsMyArticlesOpen(false); setSelectedArticle(a); }}
        onEditClick={(a) => { setIsMyArticlesOpen(false); setEditingArticle(a); }}
        onDeleteClick={handleDeleteArticle}
      />
      <AllArticlesModal isOpen={isAllArticlesOpen} onClose={() => setIsAllArticlesOpen(false)} articles={filteredArticles.map(mapArticle)} title={selectedCategory ? `Статьи: ${selectedCategory.name}` : 'Все статьи'} />
      <ArticleDetailModal isOpen={!!selectedArticle} onClose={() => setSelectedArticle(null)} article={selectedArticle} />
      <UpgradeToPlusModal isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} feature="articles" />
    </div>
  );
}
