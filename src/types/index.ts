export interface User {
  id: string;
  telegram_id: number;
  username: string;
  first_name: string;
  last_name?: string;
  avatar_url?: string;
  reputation: number;
  articles_count: number;
  is_premium: boolean;
  subscription_tier?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  topics_count: number;
}

export interface Topic {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  articles_count: number;
}

export interface Article {
  id: string;
  author_id: string;
  author?: User;
  category_id: string;
  topic_id: string;
  topic?: string;
  title: string;
  preview: string;
  body: string;
  media_url?: string;
  media_type?: 'image' | 'youtube';
  is_anonymous: boolean;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  likes_count: number;
  comments_count: number;
  favorites_count: number;
  views_count?: number;
  rep_score: number;
  allow_comments: boolean;
  sources?: string[];
  created_at: string;
  updated_at: string;
}

export interface Podcast {
  id: string;
  youtube_url: string;
  youtube_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  duration: string;
  channel_name?: string;
  created_at: string;
}

export interface Comment {
  id: string;
  article_id: string;
  author_id: string;
  author?: User;
  body: string;
  created_at: string;
}

export interface ArticleAction {
  type: 'like' | 'favorite' | 'rep';
  value?: number;
}
