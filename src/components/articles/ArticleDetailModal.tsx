import { useState, useEffect } from 'react';
import { X, Heart, MessageCircle, Bookmark, Send, Loader2, Crown, Calendar, FileText, Star, Flag, ChevronDown, ChevronUp, Reply, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Article } from '@/types';
import { cn } from '@/lib/utils';
import { useArticles } from '@/hooks/use-articles';
import { supabase } from '@/integrations/supabase/client';
import { AuthorBadge } from '@/components/profile/UserBadges';
import { MentionText } from '@/components/ui/MentionText';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Comment {
  id: string;
  body: string;
  created_at: string;
  parent_id?: string | null;
  author?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_premium: boolean | null;
    subscription_tier: string | null;
  } | null;
}

interface ArticleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article | null;
  onAuthorClick?: (authorId: string) => void;
}

export function ArticleDetailModal({
  isOpen,
  onClose,
  article,
  onAuthorClick,
}: ArticleDetailModalProps) {
  const [comment, setComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [authorArticlesCount, setAuthorArticlesCount] = useState(0);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const { toggleLike, toggleFavorite, addComment, getArticleState, reportArticle, addView } = useArticles();

  useEffect(() => {
    if (isOpen && article) {
      setLikesCount(article.likes_count || 0);
      setFavoritesCount(article.favorites_count || 0);
      setViewsCount(article.views_count || 0);
      setIsLiked(false);
      setIsFavorited(false);
      setComments([]);
      setAuthorArticlesCount(0);
      setExpandedReplies(new Set());
      setReplyingTo(null);
      
      // Load article state
      setIsLoadingState(true);
      getArticleState(article.id).then((state) => {
        setIsLiked(state.isLiked);
        setIsFavorited(state.isFavorited);
        setComments(state.comments || []);
        setIsLoadingState(false);
      });

      // Add view
      addView(article.id).then((result) => {
        if (result?.views_count !== undefined) {
          setViewsCount(result.views_count);
        }
      });

      // Load author's articles count
      if (article.author && !article.is_anonymous) {
        supabase
          .from('articles')
          .select('*', { count: 'exact', head: true })
          .eq('author_id', article.author.id)
          .eq('status', 'approved')
          .then(({ count }) => {
            setAuthorArticlesCount(count || 0);
          });
      }
    }
  }, [isOpen, article, getArticleState, addView]);

  if (!isOpen || !article) return null;

  // Separate top-level comments and replies
  const topLevelComments = comments.filter(c => !c.parent_id);
  const repliesMap = comments.reduce((acc, c) => {
    if (c.parent_id) {
      if (!acc[c.parent_id]) acc[c.parent_id] = [];
      acc[c.parent_id].push(c);
    }
    return acc;
  }, {} as Record<string, Comment[]>);

  const handleLike = async () => {
    const result = await toggleLike(article.id);
    if (result) {
      setIsLiked(result.isLiked);
      setLikesCount(result.likesCount);
    }
  };

  const handleFavorite = async () => {
    const result = await toggleFavorite(article.id);
    if (result) {
      setIsFavorited(result.isFavorited);
      setFavoritesCount(result.favoritesCount);
    }
  };

  const handleSubmitComment = async () => {
    if (!comment.trim()) return;
    setIsSubmittingComment(true);
    const result = await addComment(article.id, comment, replyingTo || undefined);
    if (result?.comment) {
      setComments([...comments, result.comment]);
      setComment('');
      setReplyingTo(null);
      // Auto-expand replies if this was a reply
      if (result.comment.parent_id) {
        setExpandedReplies(prev => new Set(prev).add(result.comment.parent_id));
      }
    }
    setIsSubmittingComment(false);
  };

  const handleSubmitReport = async () => {
    if (!reportReason.trim()) return;
    setIsSubmittingReport(true);
    const success = await reportArticle(article.id, reportReason);
    setIsSubmittingReport(false);
    if (success) {
      setIsReportOpen(false);
      setReportReason('');
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const handleReplyClick = (commentId: string) => {
    setReplyingTo(commentId);
    // Focus on input
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setComment('');
  };

  // Handle @mention click - resolve username to profile ID and open profile
  const handleMentionClick = async (username: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle();
      
      if (profile && onAuthorClick) {
        onAuthorClick(profile.id);
      }
    } catch (err) {
      console.error('Error finding user by username:', err);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCommentDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getReplyingToComment = () => {
    if (!replyingTo) return null;
    return comments.find(c => c.id === replyingTo);
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/95 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col bg-card animate-fade-in md:inset-4 md:rounded-2xl">
        {/* Header - показываем тему, а если её нет — заголовок */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card p-4">
          <h2 className="font-heading text-lg font-semibold line-clamp-1 text-muted-foreground">
            {(article.topic && String(article.topic).trim().length ? article.topic : article.title) || 'Статья'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Author Section */}
          {article.author && !article.is_anonymous && (
            <div className="border-b border-border p-4">
              <button
                onClick={() => {
                  if (onAuthorClick && article.author) {
                    onAuthorClick(article.author.id);
                  }
                }}
                className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity"
                disabled={!onAuthorClick}
              >
                <img
                  src={article.author.avatar_url || '/placeholder.svg'}
                  alt={article.author.first_name}
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {(article.author.subscription_tier === 'plus' || article.author.subscription_tier === 'premium') && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="font-medium">
                      {article.author.first_name} {article.author.last_name}
                    </span>
                    {article.author.id && <AuthorBadge userProfileId={article.author.id} />}
                  </div>
                  {article.author.username && (
                    <p className="text-sm text-muted-foreground">@{article.author.username}</p>
                  )}
                </div>
              </button>
              
              {/* Author Stats */}
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" />
                  <span>{article.author.reputation || 0} репутации</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{authorArticlesCount} статей</span>
                </div>
                {article.author.created_at && formatDate(article.author.created_at) && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>С {formatDate(article.author.created_at)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Anonymous Author */}
          {article.is_anonymous && (
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xl">👤</span>
                </div>
                <div>
                  <span className="font-medium">Аноним</span>
                  <p className="text-sm text-muted-foreground">Автор скрыл свою личность</p>
                </div>
              </div>
            </div>
          )}

          {/* Media */}
          {article.media_url && (
            <div className="p-4">
              {article.media_type === 'youtube' ? (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                  <iframe
                    src={`https://www.youtube.com/embed/${article.media_url}`}
                    className="absolute inset-0 h-full w-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              ) : (
                <img
                  src={article.media_url}
                  alt={article.title}
                  className="w-full rounded-xl object-cover max-h-80"
                />
              )}
            </div>
          )}

          {/* Article Body */}
          <div className="p-4">
            {/* Title above body in larger white font */}
            <h1 className="font-heading text-xl font-bold text-foreground mb-4">
              {article.title}
            </h1>
            <div className="prose prose-sm max-w-none text-foreground">
              <p className="whitespace-pre-wrap">{article.body}</p>
            </div>

            {/* Sources */}
            {article.sources && article.sources.length > 0 && (
              <div className="mt-6 rounded-xl bg-secondary/50 p-4">
                <h4 className="mb-2 text-sm font-medium">Источники:</h4>
                <ul className="space-y-1">
                  {article.sources.map((source, i) => {
                    // Ensure URL has proper protocol
                    const url = source.startsWith('http://') || source.startsWith('https://') 
                      ? source 
                      : `https://${source}`;
                    return (
                      <li key={i} className="text-sm text-primary hover:underline">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          {source}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Article Meta */}
            <div className="mt-4 text-xs text-muted-foreground">
              <span>Опубликовано {formatDate(article.created_at)}</span>
            </div>
          </div>

          {/* Comments Section */}
          {topLevelComments.length > 0 && (
            <div className="border-t border-border p-4">
              <h3 className="text-sm font-medium mb-3">Комментарии ({topLevelComments.length})</h3>
              <div className="space-y-4">
                {topLevelComments.map((c) => {
                  const replies = repliesMap[c.id] || [];
                  const isExpanded = expandedReplies.has(c.id);
                  
                  return (
                    <div key={c.id} className="space-y-2">
                      {/* Main comment */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => c.author?.id && onAuthorClick?.(c.author.id)}
                          className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                          disabled={!c.author?.id || !onAuthorClick}
                        >
                          <img
                            src={c.author?.avatar_url || '/placeholder.svg'}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {(c.author?.subscription_tier === 'plus' || c.author?.subscription_tier === 'premium') && (
                              <Crown className="h-3 w-3 text-yellow-500" />
                            )}
                            <button
                              onClick={() => c.author?.id && onAuthorClick?.(c.author.id)}
                              className="text-sm font-medium hover:text-primary transition-colors"
                              disabled={!c.author?.id || !onAuthorClick}
                            >
                              {c.author?.first_name || 'Пользователь'}
                            </button>
                            {c.author?.id && <AuthorBadge userProfileId={c.author.id} className="text-xs" />}
                            <span className="text-xs text-muted-foreground">
                              {formatCommentDate(c.created_at)}
                            </span>
                          </div>
                          <MentionText 
                            text={c.body} 
                            onMentionClick={handleMentionClick}
                            className="text-sm text-foreground mt-0.5"
                          />
                          
                          {/* Reply button and replies toggle */}
                          <div className="flex items-center gap-3 mt-2">
                            <button
                              onClick={() => handleReplyClick(c.id)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Reply className="h-3 w-3" />
                              Ответить
                            </button>
                            
                            {replies.length > 0 && (
                              <button
                                onClick={() => toggleReplies(c.id)}
                                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-3 w-3" />
                                    Скрыть ответы
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3 w-3" />
                                    {replies.length} {replies.length === 1 ? 'ответ' : replies.length < 5 ? 'ответа' : 'ответов'}
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Replies - visually distinct */}
                      {isExpanded && replies.length > 0 && (
                        <div className="ml-8 pl-4 border-l-2 border-primary/30 space-y-3">
                          {replies.map((reply) => (
                            <div key={reply.id} className="flex gap-3 bg-secondary/30 rounded-lg p-2">
                              <button
                                onClick={() => reply.author?.id && onAuthorClick?.(reply.author.id)}
                                className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                disabled={!reply.author?.id || !onAuthorClick}
                              >
                                <img
                                  src={reply.author?.avatar_url || '/placeholder.svg'}
                                  alt=""
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {(reply.author?.subscription_tier === 'plus' || reply.author?.subscription_tier === 'premium') && (
                                    <Crown className="h-2.5 w-2.5 text-yellow-500" />
                                  )}
                                  <button
                                    onClick={() => reply.author?.id && onAuthorClick?.(reply.author.id)}
                                    className="text-xs font-medium hover:text-primary transition-colors"
                                    disabled={!reply.author?.id || !onAuthorClick}
                                  >
                                    {reply.author?.first_name || 'Пользователь'}
                                  </button>
                                  {reply.author?.id && <AuthorBadge userProfileId={reply.author.id} className="text-[10px]" />}
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatCommentDate(reply.created_at)}
                                  </span>
                                </div>
                                <MentionText 
                                  text={reply.body} 
                                  onMentionClick={handleMentionClick}
                                  className="text-xs text-foreground mt-0.5"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="sticky bottom-0 border-t border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleLike}
                  disabled={isLoadingState}
                  className={cn(
                    'flex items-center gap-1.5 transition-colors',
                    isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
                  )}
                >
                  <Heart className={cn('h-6 w-6', isLiked && 'fill-current')} />
                  <span className="text-sm font-medium">{likesCount}</span>
                </button>
                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                  <MessageCircle className="h-6 w-6" />
                  <span className="text-sm font-medium">{topLevelComments.length}</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                {/* Views */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">+{viewsCount}</span>
                </div>
                <button
                  onClick={() => setIsReportOpen(true)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Пожаловаться"
                >
                  <Flag className="h-5 w-5" />
                </button>
                <button
                  onClick={handleFavorite}
                  disabled={isLoadingState}
                  className={cn(
                    'transition-colors',
                    isFavorited ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                  )}
                >
                  <Bookmark className={cn('h-6 w-6', isFavorited && 'fill-current')} />
                </button>
              </div>
            </div>

            {/* Replying indicator */}
            {replyingTo && (
              <div className="flex items-center justify-between mb-2 px-2 py-1 bg-secondary/50 rounded-lg">
                <span className="text-xs text-muted-foreground">
                  Ответ на комментарий {getReplyingToComment()?.author?.first_name || 'пользователя'}
                </span>
                <button onClick={cancelReply} className="text-xs text-destructive hover:underline">
                  Отмена
                </button>
              </div>
            )}

            {/* Comment Input */}
            {article.allow_comments !== false && (
              <div className="flex gap-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={replyingTo ? "Написать ответ..." : "Написать комментарий..."}
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                />
                <Button
                  size="icon"
                  onClick={handleSubmitComment}
                  disabled={!comment.trim() || isSubmittingComment}
                >
                  {isSubmittingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Dialog */}
      <AlertDialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Пожаловаться на статью</AlertDialogTitle>
            <AlertDialogDescription>
              Опишите причину жалобы. Модераторы рассмотрят ваше обращение.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Причина жалобы..."
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReportReason('')}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitReport}
              disabled={!reportReason.trim() || isSubmittingReport}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmittingReport ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Отправить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}