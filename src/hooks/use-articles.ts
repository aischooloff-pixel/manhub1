import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Article {
  id: string;
  author_id: string | null;
  category_id: string | null;
  title: string;
  topic?: string | null;
  preview: string | null;
  body: string;
  media_url: string | null;
  media_type: string | null;
  is_anonymous: boolean | null;
  status: string | null;
  rejection_reason: string | null;
  likes_count: number | null;
  comments_count: number | null;
  favorites_count: number | null;
  rep_score: number | null;
  allow_comments: boolean | null;
  sources?: string[] | null;
  pending_edit?: any | null;
  created_at: string | null;
  updated_at: string | null;
  author?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_premium: boolean | null;
    reputation: number | null;
    show_avatar?: boolean | null;
    show_name?: boolean | null;
    show_username?: boolean | null;
    created_at?: string | null;
  } | null;
}

export interface CreateArticleData {
  category_id: string;
  title: string;
  body: string;
  topic?: string;
  preview?: string;
  media_url?: string;
  media_type?: 'image' | 'youtube';
  is_anonymous?: boolean;
  allow_comments?: boolean;
  sources?: string[];
}

function getInitData() {
  // @ts-ignore
  const tg = window.Telegram?.WebApp;
  return tg?.initData || '';
}

async function extractEdgeErrorMessage(err: any): Promise<string> {
  try {
    const res = err?.context;
    if (res && typeof res.json === 'function') {
      const body = await res.json().catch(() => null);
      const msg = body?.error || body?.message;
      if (msg) return String(msg);
    }
  } catch {
    // ignore
  }
  return err?.message || 'Ошибка запроса к серверу';
}

export function useArticles() {
  const [loading, setLoading] = useState(false);

  // Get approved articles (public, no auth needed)
  const getApprovedArticles = useCallback(async (limit = 20) => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          author:author_id(id, first_name, last_name, username, avatar_url, is_premium, reputation, show_avatar, show_name, show_username, created_at)
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Article[];
    } catch (err) {
      console.error('Error fetching articles:', err);
      return [];
    }
  }, []);

  // Get user's articles via backend function
  const getUserArticles = useCallback(async () => {
    const initData = getInitData();
    if (!initData) return [];

    try {
      const { data, error } = await supabase.functions.invoke('tg-my-articles', {
        body: { initData },
      });

      if (error) {
        const msg = await extractEdgeErrorMessage(error);
        throw new Error(msg);
      }

      return (data?.articles || []) as Article[];
    } catch (err) {
      console.error('Error fetching user articles:', err);
      return [];
    }
  }, []);

  // Create article via backend function
  const createArticle = useCallback(async (articleData: CreateArticleData): Promise<any> => {
    const initData = getInitData();
    if (!initData) {
      toast.error('Необходимо авторизоваться через Telegram');
      return { error: 'auth_required' };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('tg-create-article', {
        body: { initData, article: articleData },
      });

      if (error) {
        const msg = await extractEdgeErrorMessage(error);
        // Check if it's a daily limit error
        if (msg.includes('daily_limit_reached') || msg.includes('лимита')) {
          return { error: 'daily_limit_reached' };
        }
        throw new Error(msg);
      }

      // Check for limit error in response
      if (data?.error === 'daily_limit_reached') {
        return { error: 'daily_limit_reached', message: data.message };
      }

      if (!data?.article) {
        throw new Error('Не удалось создать статью');
      }

      // Send moderation request
      try {
        await supabase.functions.invoke('send-moderation', {
          body: { articleId: data.article.id },
        });
      } catch (modError) {
        console.error('Error sending moderation request:', modError);
      }

      toast.success('Статья отправлена на модерацию');
      return { article: data.article };
    } catch (err: any) {
      console.error('Error creating article:', err);
      toast.error(err?.message || 'Ошибка создания статьи');
      return { error: 'unknown' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Update article via backend function
  const updateArticle = useCallback(async (articleId: string, updates: Partial<CreateArticleData>) => {
    const initData = getInitData();
    if (!initData) {
      toast.error('Необходимо авторизоваться через Telegram');
      return false;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('tg-update-article', {
        body: { initData, articleId, updates },
      });

      if (error) {
        const msg = await extractEdgeErrorMessage(error);
        throw new Error(msg);
      }

      toast.success('Редактирование отправлено на модерацию');
      return true;
    } catch (err: any) {
      console.error('Error updating article:', err);
      toast.error(err?.message || 'Ошибка редактирования статьи');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete article via backend function
  const deleteArticle = useCallback(async (articleId: string) => {
    const initData = getInitData();
    if (!initData) {
      toast.error('Необходимо авторизоваться через Telegram');
      return false;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('tg-delete-article', {
        body: { initData, articleId },
      });

      if (error) {
        const msg = await extractEdgeErrorMessage(error);
        throw new Error(msg);
      }

      toast.success('Статья удалена');
      return true;
    } catch (err: any) {
      console.error('Error deleting article:', err);
      toast.error(err?.message || 'Ошибка удаления статьи');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle like
  const toggleLike = useCallback(async (articleId: string) => {
    const initData = getInitData();
    if (!initData) {
      toast.error('Необходимо авторизоваться через Telegram');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('tg-toggle-like', {
        body: { initData, articleId },
      });

      if (error) {
        const msg = await extractEdgeErrorMessage(error);
        throw new Error(msg);
      }

      return data;
    } catch (err: any) {
      console.error('Error toggling like:', err);
      toast.error(err?.message || 'Ошибка');
      return null;
    }
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback(async (articleId: string) => {
    const initData = getInitData();
    if (!initData) {
      toast.error('Необходимо авторизоваться через Telegram');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('tg-toggle-favorite', {
        body: { initData, articleId },
      });

      if (error) {
        const msg = await extractEdgeErrorMessage(error);
        throw new Error(msg);
      }

      return data;
    } catch (err: any) {
      console.error('Error toggling favorite:', err);
      toast.error(err?.message || 'Ошибка');
      return null;
    }
  }, []);

  // Add comment (with optional parentId for replies)
  const addComment = useCallback(async (articleId: string, body: string, parentId?: string) => {
    const initData = getInitData();
    if (!initData) {
      toast.error('Необходимо авторизоваться через Telegram');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('tg-add-comment', {
        body: { initData, articleId, body, parentId },
      });

      if (error) {
        const msg = await extractEdgeErrorMessage(error);
        throw new Error(msg);
      }

      return data;
    } catch (err: any) {
      console.error('Error adding comment:', err);
      toast.error(err?.message || 'Ошибка');
      return null;
    }
  }, []);

  // Get article state (like/favorite status, comments)
  const getArticleState = useCallback(async (articleId: string) => {
    const initData = getInitData();

    try {
      const { data, error } = await supabase.functions.invoke('tg-get-article-state', {
        body: { initData, articleId },
      });

      if (error) {
        console.error('Error getting article state:', error);
        return { isLiked: false, isFavorited: false, comments: [] };
      }

      return data;
    } catch (err) {
      console.error('Error getting article state:', err);
      return { isLiked: false, isFavorited: false, comments: [] };
    }
  }, []);

  // Report article
  const reportArticle = useCallback(async (articleId: string, reason: string) => {
    const initData = getInitData();
    if (!initData) {
      toast.error('Необходимо авторизоваться через Telegram');
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('tg-report-article', {
        body: { initData, articleId, reason },
      });

      if (error) {
        const msg = await extractEdgeErrorMessage(error);
        throw new Error(msg);
      }

      toast.success('Жалоба отправлена');
      return true;
    } catch (err: any) {
      console.error('Error reporting article:', err);
      toast.error(err?.message || 'Ошибка отправки жалобы');
      return false;
    }
  }, []);

  return {
    loading,
    getApprovedArticles,
    getUserArticles,
    createArticle,
    updateArticle,
    deleteArticle,
    toggleLike,
    toggleFavorite,
    addComment,
    getArticleState,
    reportArticle,
  };
}
