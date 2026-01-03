CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: badge_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.badge_type AS ENUM (
    'author',
    'experienced_author',
    'legend',
    'man',
    'expert',
    'sage',
    'partner',
    'founder',
    'moderator_badge',
    'referrer',
    'hustler',
    'ambassador'
);


--
-- Name: create_comment_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_comment_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_article_author_id uuid;
  v_article_title text;
  v_commenter_name text;
BEGIN
  -- Get article author
  SELECT author_id, title INTO v_article_author_id, v_article_title
  FROM articles
  WHERE id = NEW.article_id;
  
  -- Don't notify if user comments on their own article
  IF v_article_author_id IS NULL OR v_article_author_id = NEW.author_id THEN
    RETURN NEW;
  END IF;
  
  -- Get commenter name - prioritize username over first_name
  SELECT COALESCE(NULLIF(username, ''), NULLIF(first_name, ''), 'Пользователь') INTO v_commenter_name
  FROM profiles
  WHERE id = NEW.author_id;
  
  -- Create notification
  INSERT INTO notifications (user_profile_id, type, message, article_id, from_user_id, is_read)
  VALUES (
    v_article_author_id,
    'comment',
    v_commenter_name || ' прокомментировал вашу статью "' || COALESCE(LEFT(v_article_title, 30), 'Статья') || '"',
    NEW.article_id,
    NEW.author_id,
    false
  );
  
  RETURN NEW;
END;
$$;


--
-- Name: create_comment_reply_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_comment_reply_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_parent_author_id uuid;
  v_article_title text;
  v_replier_name text;
BEGIN
  -- Only process replies (comments with parent_id)
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get parent comment author
  SELECT author_id INTO v_parent_author_id
  FROM article_comments
  WHERE id = NEW.parent_id;
  
  -- Don't notify if user replies to their own comment
  IF v_parent_author_id IS NULL OR v_parent_author_id = NEW.author_id THEN
    RETURN NEW;
  END IF;
  
  -- Get article title
  SELECT title INTO v_article_title
  FROM articles
  WHERE id = NEW.article_id;
  
  -- Get replier name - prioritize username over first_name
  SELECT COALESCE(NULLIF(username, ''), NULLIF(first_name, ''), 'Пользователь') INTO v_replier_name
  FROM profiles
  WHERE id = NEW.author_id;
  
  -- Create notification
  INSERT INTO notifications (user_profile_id, type, message, article_id, from_user_id, is_read)
  VALUES (
    v_parent_author_id,
    'reply',
    v_replier_name || ' ответил на ваш комментарий к статье "' || COALESCE(LEFT(v_article_title, 30), 'Статья') || '"',
    NEW.article_id,
    NEW.author_id,
    false
  );
  
  RETURN NEW;
END;
$$;


--
-- Name: create_favorite_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_favorite_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_article_author_id uuid;
  v_article_title text;
  v_user_name text;
BEGIN
  -- Get article author
  SELECT author_id, title INTO v_article_author_id, v_article_title
  FROM articles
  WHERE id = NEW.article_id;
  
  -- Don't notify if user favorites their own article
  IF v_article_author_id IS NULL OR v_article_author_id = NEW.user_profile_id THEN
    RETURN NEW;
  END IF;
  
  -- Get user name - prioritize username over first_name
  SELECT COALESCE(NULLIF(username, ''), NULLIF(first_name, ''), 'Пользователь') INTO v_user_name
  FROM profiles
  WHERE id = NEW.user_profile_id;
  
  -- Create notification
  INSERT INTO notifications (user_profile_id, type, message, article_id, from_user_id, is_read)
  VALUES (
    v_article_author_id,
    'favorite',
    v_user_name || ' добавил вашу статью "' || COALESCE(LEFT(v_article_title, 30), 'Статья') || '" в избранное',
    NEW.article_id,
    NEW.user_profile_id,
    false
  );
  
  RETURN NEW;
END;
$$;


--
-- Name: create_like_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_like_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_article_author_id uuid;
  v_article_title text;
  v_liker_name text;
BEGIN
  -- Get article author
  SELECT author_id, title INTO v_article_author_id, v_article_title
  FROM articles
  WHERE id = NEW.article_id;
  
  -- Don't notify if user likes their own article
  IF v_article_author_id IS NULL OR v_article_author_id = NEW.user_profile_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker name - prioritize username over first_name
  SELECT COALESCE(NULLIF(username, ''), NULLIF(first_name, ''), 'Пользователь') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_profile_id;
  
  -- Create notification
  INSERT INTO notifications (user_profile_id, type, message, article_id, from_user_id, is_read)
  VALUES (
    v_article_author_id,
    'like',
    v_liker_name || ' понравилась ваша статья "' || COALESCE(LEFT(v_article_title, 30), 'Статья') || '"',
    NEW.article_id,
    NEW.user_profile_id,
    false
  );
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_product_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_product_code() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;


--
-- Name: generate_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_referral_code() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;


--
-- Name: generate_short_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_short_id() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;


--
-- Name: get_badge_display(public.badge_type); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_badge_display(p_badge public.badge_type) RETURNS TABLE(name text, emoji text, priority integer)
    LANGUAGE sql STABLE
    AS $$
  SELECT 
    CASE p_badge
      -- Staff (highest priority)
      WHEN 'founder' THEN 'Основатель'
      WHEN 'moderator_badge' THEN 'Модератор'
      WHEN 'partner' THEN 'Партнёр'
      -- Publication
      WHEN 'legend' THEN 'Легенда'
      WHEN 'experienced_author' THEN 'Опытный автор'
      WHEN 'author' THEN 'Автор'
      -- Reputation
      WHEN 'sage' THEN 'Мудрец'
      WHEN 'expert' THEN 'Эксперт'
      WHEN 'man' THEN 'Мужчина'
      -- Referral
      WHEN 'ambassador' THEN 'Амбассадор'
      WHEN 'hustler' THEN 'Хастлер'
      WHEN 'referrer' THEN 'Рефер'
    END,
    CASE p_badge
      WHEN 'founder' THEN '👑'
      WHEN 'moderator_badge' THEN '🛡️'
      WHEN 'partner' THEN '🤝'
      WHEN 'legend' THEN '🏆'
      WHEN 'experienced_author' THEN '✍️'
      WHEN 'author' THEN '📝'
      WHEN 'sage' THEN '🧙'
      WHEN 'expert' THEN '🎓'
      WHEN 'man' THEN '💪'
      WHEN 'ambassador' THEN '🌟'
      WHEN 'hustler' THEN '🔥'
      WHEN 'referrer' THEN '👥'
    END,
    CASE p_badge
      WHEN 'founder' THEN 100
      WHEN 'moderator_badge' THEN 90
      WHEN 'partner' THEN 80
      WHEN 'legend' THEN 70
      WHEN 'sage' THEN 65
      WHEN 'ambassador' THEN 60
      WHEN 'experienced_author' THEN 50
      WHEN 'expert' THEN 45
      WHEN 'hustler' THEN 40
      WHEN 'author' THEN 30
      WHEN 'man' THEN 25
      WHEN 'referrer' THEN 20
    END;
$$;


--
-- Name: get_or_create_short_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_or_create_short_id(p_article_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_short_id TEXT;
BEGIN
  -- Try to find existing
  SELECT short_id INTO v_short_id FROM moderation_short_ids WHERE article_id = p_article_id;
  
  IF v_short_id IS NOT NULL THEN
    RETURN v_short_id;
  END IF;
  
  -- Generate new unique short ID
  LOOP
    v_short_id := generate_short_id();
    BEGIN
      INSERT INTO moderation_short_ids (short_id, article_id) VALUES (v_short_id, p_article_id);
      RETURN v_short_id;
    EXCEPTION WHEN unique_violation THEN
      -- Try again with new short ID
    END;
  END LOOP;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: notify_badge_granted(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_badge_granted() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_badge_name text;
  v_badge_emoji text;
BEGIN
  -- Map badge type to human-readable name and emoji
  SELECT 
    CASE NEW.badge
      WHEN 'author' THEN 'Автор'
      WHEN 'experienced_author' THEN 'Опытный автор'
      WHEN 'legend' THEN 'Легенда'
      WHEN 'man' THEN 'Мужчина'
      WHEN 'expert' THEN 'Эксперт'
      WHEN 'sage' THEN 'Мудрец'
      WHEN 'partner' THEN 'Партнёр'
      WHEN 'founder' THEN 'Основатель'
      WHEN 'moderator_badge' THEN 'Модератор'
      WHEN 'referrer' THEN 'Рефер'
      WHEN 'hustler' THEN 'Хастлер'
      WHEN 'ambassador' THEN 'Амбассадор'
      ELSE NEW.badge::text
    END,
    CASE NEW.badge
      WHEN 'author' THEN '📝'
      WHEN 'experienced_author' THEN '✍️'
      WHEN 'legend' THEN '🏆'
      WHEN 'man' THEN '💪'
      WHEN 'expert' THEN '🎓'
      WHEN 'sage' THEN '🧙'
      WHEN 'partner' THEN '🤝'
      WHEN 'founder' THEN '👑'
      WHEN 'moderator_badge' THEN '🛡️'
      WHEN 'referrer' THEN '👥'
      WHEN 'hustler' THEN '🔥'
      WHEN 'ambassador' THEN '🌟'
      ELSE '🏅'
    END
  INTO v_badge_name, v_badge_emoji;

  -- Insert notification
  INSERT INTO notifications (user_profile_id, type, message)
  VALUES (
    NEW.user_profile_id,
    'badge',
    v_badge_emoji || ' Вам присвоен значок «' || v_badge_name || '»!'
  );

  RETURN NEW;
END;
$$;


--
-- Name: recalculate_user_badges(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalculate_user_badges(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_articles_count int;
  v_reputation int;
  v_paying_referrals int;
BEGIN
  -- Get article count
  SELECT COUNT(*) INTO v_articles_count
  FROM articles
  WHERE author_id = p_user_id AND status = 'approved';

  -- Get reputation
  SELECT COALESCE(reputation, 0) INTO v_reputation
  FROM profiles
  WHERE id = p_user_id;

  -- Get paying referrals count
  SELECT COUNT(DISTINCT referred_id) INTO v_paying_referrals
  FROM referral_earnings
  WHERE referrer_id = p_user_id;

  -- Publication badges (PROGRESSIVE - only keep highest tier)
  -- Remove all automatic publication badges first, then add the appropriate one
  DELETE FROM user_badges 
  WHERE user_profile_id = p_user_id 
    AND badge IN ('author', 'experienced_author', 'legend') 
    AND is_manual = false;

  IF v_articles_count >= 30 THEN
    INSERT INTO user_badges (user_profile_id, badge, is_manual)
    VALUES (p_user_id, 'legend', false)
    ON CONFLICT (user_profile_id, badge) DO NOTHING;
  ELSIF v_articles_count >= 10 THEN
    INSERT INTO user_badges (user_profile_id, badge, is_manual)
    VALUES (p_user_id, 'experienced_author', false)
    ON CONFLICT (user_profile_id, badge) DO NOTHING;
  ELSIF v_articles_count >= 3 THEN
    INSERT INTO user_badges (user_profile_id, badge, is_manual)
    VALUES (p_user_id, 'author', false)
    ON CONFLICT (user_profile_id, badge) DO NOTHING;
  END IF;

  -- Reputation badges (PROGRESSIVE - only keep highest tier)
  DELETE FROM user_badges 
  WHERE user_profile_id = p_user_id 
    AND badge IN ('man', 'expert', 'sage') 
    AND is_manual = false;

  IF v_reputation >= 1000 THEN
    INSERT INTO user_badges (user_profile_id, badge, is_manual)
    VALUES (p_user_id, 'sage', false)
    ON CONFLICT (user_profile_id, badge) DO NOTHING;
  ELSIF v_reputation >= 200 THEN
    INSERT INTO user_badges (user_profile_id, badge, is_manual)
    VALUES (p_user_id, 'expert', false)
    ON CONFLICT (user_profile_id, badge) DO NOTHING;
  ELSIF v_reputation >= 50 THEN
    INSERT INTO user_badges (user_profile_id, badge, is_manual)
    VALUES (p_user_id, 'man', false)
    ON CONFLICT (user_profile_id, badge) DO NOTHING;
  END IF;

  -- Referral badges (PROGRESSIVE - only keep highest tier)
  DELETE FROM user_badges 
  WHERE user_profile_id = p_user_id 
    AND badge IN ('referrer', 'hustler', 'ambassador') 
    AND is_manual = false;

  IF v_paying_referrals >= 20 THEN
    INSERT INTO user_badges (user_profile_id, badge, is_manual)
    VALUES (p_user_id, 'ambassador', false)
    ON CONFLICT (user_profile_id, badge) DO NOTHING;
  ELSIF v_paying_referrals >= 10 THEN
    INSERT INTO user_badges (user_profile_id, badge, is_manual)
    VALUES (p_user_id, 'hustler', false)
    ON CONFLICT (user_profile_id, badge) DO NOTHING;
  ELSIF v_paying_referrals >= 5 THEN
    INSERT INTO user_badges (user_profile_id, badge, is_manual)
    VALUES (p_user_id, 'referrer', false)
    ON CONFLICT (user_profile_id, badge) DO NOTHING;
  END IF;
END;
$$;


--
-- Name: set_product_short_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_product_short_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.short_code IS NULL THEN
    LOOP
      NEW.short_code := generate_product_code();
      BEGIN
        -- Check if exists
        PERFORM 1 FROM user_products WHERE short_code = NEW.short_code;
        IF NOT FOUND THEN
          EXIT; -- unique, exit loop
        END IF;
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_referral_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      NEW.referral_code := generate_referral_code();
      BEGIN
        PERFORM 1 FROM profiles WHERE referral_code = NEW.referral_code;
        IF NOT FOUND THEN
          EXIT;
        END IF;
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: trigger_recalculate_badges_on_article(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_recalculate_badges_on_article() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    PERFORM recalculate_user_badges(NEW.author_id);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: trigger_recalculate_badges_on_referral(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_recalculate_badges_on_referral() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM recalculate_user_badges(NEW.referrer_id);
  RETURN NEW;
END;
$$;


--
-- Name: trigger_recalculate_badges_on_reputation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_recalculate_badges_on_reputation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM recalculate_user_badges(NEW.id);
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: article_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    author_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    parent_id uuid
);


--
-- Name: article_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    user_profile_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: article_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    user_profile_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: article_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    reporter_profile_id uuid NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by_telegram_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: article_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    user_profile_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid,
    category_id text,
    title text NOT NULL,
    preview text,
    body text NOT NULL,
    media_url text,
    media_type text,
    is_anonymous boolean DEFAULT false,
    status text DEFAULT 'pending'::text,
    rejection_reason text,
    likes_count integer DEFAULT 0,
    comments_count integer DEFAULT 0,
    favorites_count integer DEFAULT 0,
    rep_score integer DEFAULT 0,
    allow_comments boolean DEFAULT true,
    telegram_message_id bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    topic text,
    sources text[],
    pending_edit jsonb,
    edited_at timestamp with time zone,
    views_count integer DEFAULT 0,
    CONSTRAINT articles_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'youtube'::text]))),
    CONSTRAINT articles_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: manual_payment_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manual_payment_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_profile_id uuid NOT NULL,
    plan text NOT NULL,
    billing_period text NOT NULL,
    amount integer NOT NULL,
    receipt_url text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    rejection_reason text,
    admin_message_id bigint,
    reviewed_by_telegram_id bigint,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: moderation_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    moderator_telegram_id bigint NOT NULL,
    action character varying(20) NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT moderation_logs_action_check CHECK (((action)::text = ANY (ARRAY[('approved'::character varying)::text, ('rejected'::character varying)::text])))
);


--
-- Name: moderation_short_ids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderation_short_ids (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    short_id character varying(8) NOT NULL,
    article_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval)
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_profile_id uuid NOT NULL,
    type text NOT NULL,
    message text NOT NULL,
    article_id uuid,
    from_user_id uuid,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pending_product_rejections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_product_rejections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    admin_telegram_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pending_rejections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_rejections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_telegram_id bigint NOT NULL,
    article_id uuid NOT NULL,
    short_id character varying(8) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: playlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service text NOT NULL,
    category text NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    cover_urls text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT playlists_category_check CHECK ((category = ANY (ARRAY['motivation'::text, 'workout'::text, 'self-development'::text]))),
    CONSTRAINT playlists_service_check CHECK ((service = ANY (ARRAY['spotify'::text, 'soundcloud'::text, 'yandex'::text])))
);


--
-- Name: podcasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.podcasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    youtube_url text NOT NULL,
    youtube_id text NOT NULL,
    title text NOT NULL,
    description text,
    thumbnail_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    telegram_id bigint,
    username text,
    first_name text,
    last_name text,
    avatar_url text,
    reputation integer DEFAULT 0,
    is_premium boolean DEFAULT false,
    telegram_channel text,
    website text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    show_avatar boolean DEFAULT true NOT NULL,
    show_name boolean DEFAULT true NOT NULL,
    show_username boolean DEFAULT true NOT NULL,
    premium_expires_at timestamp with time zone,
    is_blocked boolean DEFAULT false NOT NULL,
    blocked_at timestamp with time zone,
    subscription_tier text DEFAULT 'free'::text NOT NULL,
    bio text,
    referral_code text,
    referred_by uuid,
    referral_earnings numeric DEFAULT 0,
    blocked_until timestamp with time zone,
    CONSTRAINT profiles_subscription_tier_check CHECK ((subscription_tier = ANY (ARRAY['free'::text, 'plus'::text, 'premium'::text])))
);


--
-- Name: promo_code_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_code_usages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    promo_code_id uuid NOT NULL,
    user_profile_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: promo_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    discount_percent integer DEFAULT 10 NOT NULL,
    max_uses integer,
    uses_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: public_profiles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.public_profiles WITH (security_invoker='true') AS
 SELECT id,
    username,
    first_name,
    last_name,
    avatar_url,
    bio,
    reputation,
    website,
    telegram_channel,
    show_name,
    show_avatar,
    show_username,
    created_at,
        CASE
            WHEN show_name THEN first_name
            ELSE NULL::text
        END AS display_first_name,
        CASE
            WHEN show_name THEN last_name
            ELSE NULL::text
        END AS display_last_name,
        CASE
            WHEN show_username THEN username
            ELSE NULL::text
        END AS display_username,
        CASE
            WHEN show_avatar THEN avatar_url
            ELSE NULL::text
        END AS display_avatar_url
   FROM public.profiles
  WHERE (is_blocked = false);


--
-- Name: referral_earnings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_earnings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    referred_id uuid NOT NULL,
    purchase_amount numeric NOT NULL,
    earning_amount numeric NOT NULL,
    purchase_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reputation_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reputation_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    from_user_id uuid,
    article_id uuid,
    value integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reputation_history_value_check CHECK ((value = ANY (ARRAY['-1'::integer, 1])))
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_profile_id uuid NOT NULL,
    rating integer NOT NULL,
    review_text text NOT NULL,
    suggestions text,
    status text DEFAULT 'pending'::text NOT NULL,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: scheduled_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_profile_id uuid NOT NULL,
    notification_type text DEFAULT 'welcome'::text NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscription_pricing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_pricing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tier text NOT NULL,
    monthly_price integer DEFAULT 0 NOT NULL,
    yearly_price integer DEFAULT 0 NOT NULL,
    monthly_original_price integer DEFAULT 0 NOT NULL,
    yearly_original_price integer DEFAULT 0 NOT NULL,
    discount_percent integer DEFAULT 50 NOT NULL,
    yearly_discount_percent integer DEFAULT 30 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT subscription_pricing_tier_check CHECK ((tier = ANY (ARRAY['plus'::text, 'premium'::text])))
);


--
-- Name: support_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_telegram_id bigint NOT NULL,
    user_profile_id uuid,
    question text NOT NULL,
    answer text,
    answered_by_telegram_id bigint,
    admin_message_id bigint,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    answered_at timestamp with time zone
);


--
-- Name: user_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_profile_id uuid NOT NULL,
    badge public.badge_type NOT NULL,
    is_manual boolean DEFAULT false NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    granted_by_telegram_id bigint
);


--
-- Name: user_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_profile_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    price numeric(10,2) NOT NULL,
    currency text DEFAULT 'RUB'::text NOT NULL,
    media_url text,
    media_type text,
    link text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    rejection_reason text,
    moderated_at timestamp with time zone,
    moderated_by_telegram_id bigint,
    short_code text,
    CONSTRAINT user_products_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'youtube'::text])))
);


--
-- Name: user_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reported_user_id uuid NOT NULL,
    reporter_profile_id uuid NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_message_id bigint,
    reviewed_at timestamp with time zone,
    reviewed_by_telegram_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_settings admin_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_key_key UNIQUE (key);


--
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);


--
-- Name: article_comments article_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_comments
    ADD CONSTRAINT article_comments_pkey PRIMARY KEY (id);


--
-- Name: article_favorites article_favorites_article_id_user_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_favorites
    ADD CONSTRAINT article_favorites_article_id_user_profile_id_key UNIQUE (article_id, user_profile_id);


--
-- Name: article_favorites article_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_favorites
    ADD CONSTRAINT article_favorites_pkey PRIMARY KEY (id);


--
-- Name: article_likes article_likes_article_id_user_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_likes
    ADD CONSTRAINT article_likes_article_id_user_profile_id_key UNIQUE (article_id, user_profile_id);


--
-- Name: article_likes article_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_likes
    ADD CONSTRAINT article_likes_pkey PRIMARY KEY (id);


--
-- Name: article_reports article_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_reports
    ADD CONSTRAINT article_reports_pkey PRIMARY KEY (id);


--
-- Name: article_views article_views_article_id_user_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_views
    ADD CONSTRAINT article_views_article_id_user_profile_id_key UNIQUE (article_id, user_profile_id);


--
-- Name: article_views article_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_views
    ADD CONSTRAINT article_views_pkey PRIMARY KEY (id);


--
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- Name: manual_payment_requests manual_payment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_payment_requests
    ADD CONSTRAINT manual_payment_requests_pkey PRIMARY KEY (id);


--
-- Name: moderation_logs moderation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_logs
    ADD CONSTRAINT moderation_logs_pkey PRIMARY KEY (id);


--
-- Name: moderation_short_ids moderation_short_ids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_short_ids
    ADD CONSTRAINT moderation_short_ids_pkey PRIMARY KEY (id);


--
-- Name: moderation_short_ids moderation_short_ids_short_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_short_ids
    ADD CONSTRAINT moderation_short_ids_short_id_key UNIQUE (short_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: pending_product_rejections pending_product_rejections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_product_rejections
    ADD CONSTRAINT pending_product_rejections_pkey PRIMARY KEY (id);


--
-- Name: pending_rejections pending_rejections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_rejections
    ADD CONSTRAINT pending_rejections_pkey PRIMARY KEY (id);


--
-- Name: playlists playlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_pkey PRIMARY KEY (id);


--
-- Name: podcasts podcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.podcasts
    ADD CONSTRAINT podcasts_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);


--
-- Name: profiles profiles_telegram_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_telegram_id_key UNIQUE (telegram_id);


--
-- Name: promo_code_usages promo_code_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_code_usages
    ADD CONSTRAINT promo_code_usages_pkey PRIMARY KEY (id);


--
-- Name: promo_codes promo_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_code_key UNIQUE (code);


--
-- Name: promo_codes promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);


--
-- Name: referral_earnings referral_earnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_earnings
    ADD CONSTRAINT referral_earnings_pkey PRIMARY KEY (id);


--
-- Name: reputation_history reputation_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reputation_history
    ADD CONSTRAINT reputation_history_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: scheduled_notifications scheduled_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_notifications
    ADD CONSTRAINT scheduled_notifications_pkey PRIMARY KEY (id);


--
-- Name: subscription_pricing subscription_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_pricing
    ADD CONSTRAINT subscription_pricing_pkey PRIMARY KEY (id);


--
-- Name: subscription_pricing subscription_pricing_tier_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_pricing
    ADD CONSTRAINT subscription_pricing_tier_key UNIQUE (tier);


--
-- Name: support_questions support_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_questions
    ADD CONSTRAINT support_questions_pkey PRIMARY KEY (id);


--
-- Name: user_badges user_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_pkey PRIMARY KEY (id);


--
-- Name: user_badges user_badges_user_profile_id_badge_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_user_profile_id_badge_key UNIQUE (user_profile_id, badge);


--
-- Name: user_products user_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_products
    ADD CONSTRAINT user_products_pkey PRIMARY KEY (id);


--
-- Name: user_products user_products_short_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_products
    ADD CONSTRAINT user_products_short_code_key UNIQUE (short_code);


--
-- Name: user_reports user_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_article_comments_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_comments_article ON public.article_comments USING btree (article_id);


--
-- Name: idx_article_comments_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_comments_parent_id ON public.article_comments USING btree (parent_id);


--
-- Name: idx_article_favorites_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_favorites_article ON public.article_favorites USING btree (article_id);


--
-- Name: idx_article_favorites_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_favorites_user ON public.article_favorites USING btree (user_profile_id);


--
-- Name: idx_article_likes_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_likes_article ON public.article_likes USING btree (article_id);


--
-- Name: idx_article_likes_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_likes_user ON public.article_likes USING btree (user_profile_id);


--
-- Name: idx_article_reports_article_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_reports_article_id ON public.article_reports USING btree (article_id);


--
-- Name: idx_article_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_reports_status ON public.article_reports USING btree (status);


--
-- Name: idx_article_views_article_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_views_article_id ON public.article_views USING btree (article_id);


--
-- Name: idx_article_views_user_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_views_user_profile ON public.article_views USING btree (user_profile_id);


--
-- Name: idx_moderation_logs_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_logs_article ON public.moderation_logs USING btree (article_id);


--
-- Name: idx_moderation_short_ids_article_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_short_ids_article_id ON public.moderation_short_ids USING btree (article_id);


--
-- Name: idx_moderation_short_ids_short_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_short_ids_short_id ON public.moderation_short_ids USING btree (short_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_user_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_profile_id ON public.notifications USING btree (user_profile_id);


--
-- Name: idx_pending_product_rejections_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_product_rejections_admin ON public.pending_product_rejections USING btree (admin_telegram_id);


--
-- Name: idx_pending_rejections_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_pending_rejections_admin ON public.pending_rejections USING btree (admin_telegram_id);


--
-- Name: idx_profiles_is_blocked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_is_blocked ON public.profiles USING btree (is_blocked);


--
-- Name: idx_promo_usage_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_promo_usage_unique ON public.promo_code_usages USING btree (promo_code_id, user_profile_id);


--
-- Name: idx_reviews_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_status ON public.reviews USING btree (status);


--
-- Name: idx_reviews_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_user ON public.reviews USING btree (user_profile_id);


--
-- Name: idx_scheduled_notifications_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_notifications_pending ON public.scheduled_notifications USING btree (scheduled_at) WHERE (sent_at IS NULL);


--
-- Name: idx_user_products_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_products_active ON public.user_products USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_user_products_short_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_products_short_code ON public.user_products USING btree (short_code);


--
-- Name: idx_user_products_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_products_status ON public.user_products USING btree (status);


--
-- Name: idx_user_products_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_products_user ON public.user_products USING btree (user_profile_id);


--
-- Name: articles on_article_approved; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_article_approved AFTER INSERT OR UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_badges_on_article();


--
-- Name: article_comments on_article_comment_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_article_comment_notification AFTER INSERT ON public.article_comments FOR EACH ROW EXECUTE FUNCTION public.create_comment_notification();


--
-- Name: article_favorites on_article_favorite_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_article_favorite_notification AFTER INSERT ON public.article_favorites FOR EACH ROW EXECUTE FUNCTION public.create_favorite_notification();


--
-- Name: article_likes on_article_like_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_article_like_notification AFTER INSERT ON public.article_likes FOR EACH ROW EXECUTE FUNCTION public.create_like_notification();


--
-- Name: user_badges on_badge_granted; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_badge_granted AFTER INSERT ON public.user_badges FOR EACH ROW EXECUTE FUNCTION public.notify_badge_granted();


--
-- Name: article_comments on_comment_reply_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_comment_reply_notification AFTER INSERT ON public.article_comments FOR EACH ROW EXECUTE FUNCTION public.create_comment_reply_notification();


--
-- Name: referral_earnings on_referral_earning_added; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_referral_earning_added AFTER INSERT ON public.referral_earnings FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_badges_on_referral();


--
-- Name: profiles on_reputation_changed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_reputation_changed AFTER UPDATE OF reputation ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_badges_on_reputation();


--
-- Name: user_products set_product_short_code_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_product_short_code_trigger BEFORE INSERT ON public.user_products FOR EACH ROW EXECUTE FUNCTION public.set_product_short_code();


--
-- Name: profiles set_profile_referral_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_profile_referral_code BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();


--
-- Name: articles update_articles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: playlists update_playlists_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON public.playlists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: podcasts update_podcasts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_podcasts_updated_at BEFORE UPDATE ON public.podcasts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: promo_codes update_promo_codes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON public.promo_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: article_comments article_comments_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_comments
    ADD CONSTRAINT article_comments_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: article_comments article_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_comments
    ADD CONSTRAINT article_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: article_comments article_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_comments
    ADD CONSTRAINT article_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.article_comments(id) ON DELETE CASCADE;


--
-- Name: article_favorites article_favorites_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_favorites
    ADD CONSTRAINT article_favorites_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: article_favorites article_favorites_user_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_favorites
    ADD CONSTRAINT article_favorites_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: article_likes article_likes_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_likes
    ADD CONSTRAINT article_likes_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: article_likes article_likes_user_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_likes
    ADD CONSTRAINT article_likes_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: article_reports article_reports_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_reports
    ADD CONSTRAINT article_reports_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: article_reports article_reports_reporter_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_reports
    ADD CONSTRAINT article_reports_reporter_profile_id_fkey FOREIGN KEY (reporter_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: articles articles_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: manual_payment_requests manual_payment_requests_user_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_payment_requests
    ADD CONSTRAINT manual_payment_requests_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: moderation_logs moderation_logs_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_logs
    ADD CONSTRAINT moderation_logs_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: moderation_short_ids moderation_short_ids_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_short_ids
    ADD CONSTRAINT moderation_short_ids_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: pending_product_rejections pending_product_rejections_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_product_rejections
    ADD CONSTRAINT pending_product_rejections_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.user_products(id) ON DELETE CASCADE;


--
-- Name: pending_rejections pending_rejections_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_rejections
    ADD CONSTRAINT pending_rejections_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.profiles(id);


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: promo_code_usages promo_code_usages_promo_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_code_usages
    ADD CONSTRAINT promo_code_usages_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id) ON DELETE CASCADE;


--
-- Name: referral_earnings referral_earnings_referred_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_earnings
    ADD CONSTRAINT referral_earnings_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.profiles(id);


--
-- Name: referral_earnings referral_earnings_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_earnings
    ADD CONSTRAINT referral_earnings_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.profiles(id);


--
-- Name: reputation_history reputation_history_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reputation_history
    ADD CONSTRAINT reputation_history_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: reputation_history reputation_history_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reputation_history
    ADD CONSTRAINT reputation_history_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: reputation_history reputation_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reputation_history
    ADD CONSTRAINT reputation_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: scheduled_notifications scheduled_notifications_user_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_notifications
    ADD CONSTRAINT scheduled_notifications_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: support_questions support_questions_user_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_questions
    ADD CONSTRAINT support_questions_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.profiles(id);


--
-- Name: user_badges user_badges_user_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_products user_products_user_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_products
    ADD CONSTRAINT user_products_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_reports user_reports_reported_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_reports user_reports_reporter_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_reporter_profile_id_fkey FOREIGN KEY (reporter_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: promo_codes Active promo codes are viewable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Active promo codes are viewable" ON public.promo_codes FOR SELECT USING (((is_active = true) AND ((expires_at IS NULL) OR (expires_at > now()))));


--
-- Name: articles Admins can update any article; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update any article" ON public.articles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: articles Admins can view all articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all articles" ON public.articles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: subscription_pricing Anyone can view pricing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view pricing" ON public.subscription_pricing FOR SELECT USING (true);


--
-- Name: articles Approved articles are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved articles are viewable by everyone" ON public.articles FOR SELECT USING ((status = 'approved'::text));


--
-- Name: user_products Approved products are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved products are viewable by everyone" ON public.user_products FOR SELECT USING (((is_active = true) AND (status = 'approved'::text)));


--
-- Name: user_badges Badges are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Badges are viewable by everyone" ON public.user_badges FOR SELECT USING (true);


--
-- Name: article_comments Comments are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Comments are viewable by everyone" ON public.article_comments FOR SELECT USING (true);


--
-- Name: article_favorites Favorites are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Favorites are viewable by everyone" ON public.article_favorites FOR SELECT USING (true);


--
-- Name: article_likes Likes are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Likes are viewable by everyone" ON public.article_likes FOR SELECT USING (true);


--
-- Name: admin_settings Only admins can access settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can access settings" ON public.admin_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: playlists Playlists are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Playlists are viewable by everyone" ON public.playlists FOR SELECT USING (true);


--
-- Name: podcasts Podcasts are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Podcasts are viewable by everyone" ON public.podcasts FOR SELECT USING (true);


--
-- Name: profiles Public can view basic profile info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view basic profile info" ON public.profiles FOR SELECT USING ((is_blocked = false));


--
-- Name: reviews Reviews are viewable by everyone when approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Reviews are viewable by everyone when approved" ON public.reviews FOR SELECT USING ((status = 'approved'::text));


--
-- Name: articles Service role can delete articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can delete articles" ON public.articles FOR DELETE USING (true);


--
-- Name: articles Service role can insert articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert articles" ON public.articles FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: profiles Service role can insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert profiles" ON public.profiles FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: user_badges Service role can manage badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage badges" ON public.user_badges USING (true) WITH CHECK (true);


--
-- Name: article_comments Service role can manage comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage comments" ON public.article_comments USING (true) WITH CHECK (true);


--
-- Name: article_favorites Service role can manage favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage favorites" ON public.article_favorites USING (true) WITH CHECK (true);


--
-- Name: article_likes Service role can manage likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage likes" ON public.article_likes USING (true) WITH CHECK (true);


--
-- Name: notifications Service role can manage notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage notifications" ON public.notifications USING (true) WITH CHECK (true);


--
-- Name: manual_payment_requests Service role can manage payment requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage payment requests" ON public.manual_payment_requests USING (true) WITH CHECK (true);


--
-- Name: playlists Service role can manage playlists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage playlists" ON public.playlists USING (true) WITH CHECK (true);


--
-- Name: podcasts Service role can manage podcasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage podcasts" ON public.podcasts USING (true) WITH CHECK (true);


--
-- Name: subscription_pricing Service role can manage pricing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage pricing" ON public.subscription_pricing USING (true) WITH CHECK (true);


--
-- Name: user_products Service role can manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage products" ON public.user_products USING (true) WITH CHECK (true);


--
-- Name: promo_codes Service role can manage promo codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage promo codes" ON public.promo_codes USING (true) WITH CHECK (true);


--
-- Name: promo_code_usages Service role can manage promo usages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage promo usages" ON public.promo_code_usages USING (true) WITH CHECK (true);


--
-- Name: referral_earnings Service role can manage referral earnings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage referral earnings" ON public.referral_earnings USING (true) WITH CHECK (true);


--
-- Name: article_reports Service role can manage reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage reports" ON public.article_reports USING (true) WITH CHECK (true);


--
-- Name: reviews Service role can manage reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage reviews" ON public.reviews USING (true) WITH CHECK (true);


--
-- Name: scheduled_notifications Service role can manage scheduled notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage scheduled notifications" ON public.scheduled_notifications USING (false) WITH CHECK (false);


--
-- Name: user_reports Service role can manage user reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage user reports" ON public.user_reports USING (true) WITH CHECK (true);


--
-- Name: article_views Service role can manage views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage views" ON public.article_views USING (true) WITH CHECK (true);


--
-- Name: articles Service role can update articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can update articles" ON public.articles FOR UPDATE TO service_role USING (true) WITH CHECK (true);


--
-- Name: profiles Service role can update profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can update profiles" ON public.profiles FOR UPDATE TO service_role USING (true) WITH CHECK (true);


--
-- Name: moderation_logs Service role only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role only" ON public.moderation_logs USING (false);


--
-- Name: moderation_short_ids Service role only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role only" ON public.moderation_short_ids USING (false);


--
-- Name: pending_product_rejections Service role only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role only" ON public.pending_product_rejections USING (false) WITH CHECK (true);


--
-- Name: pending_rejections Service role only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role only" ON public.pending_rejections USING (false);


--
-- Name: reputation_history Service role only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role only" ON public.reputation_history TO service_role USING (true) WITH CHECK (true);


--
-- Name: support_questions Service role only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role only" ON public.support_questions USING (false) WITH CHECK (true);


--
-- Name: notifications Users can view only their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view only their own notifications" ON public.notifications FOR SELECT USING ((auth.role() = 'service_role'::text));


--
-- Name: manual_payment_requests Users can view own payment requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own payment requests" ON public.manual_payment_requests FOR SELECT USING ((user_profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.telegram_id IS NOT NULL))));


--
-- Name: referral_earnings Users can view own referral earnings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own referral earnings" ON public.referral_earnings FOR SELECT USING ((referrer_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.telegram_id IS NOT NULL))));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: article_reports Users can view their own reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own reports" ON public.article_reports FOR SELECT USING ((reporter_profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.telegram_id IS NOT NULL))));


--
-- Name: user_reports Users can view their own reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own reports" ON public.user_reports FOR SELECT USING ((reporter_profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.telegram_id IS NOT NULL))));


--
-- Name: article_views Views are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Views are viewable by everyone" ON public.article_views FOR SELECT USING (true);


--
-- Name: admin_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: article_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.article_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: article_favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.article_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: article_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: article_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.article_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: article_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.article_views ENABLE ROW LEVEL SECURITY;

--
-- Name: articles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

--
-- Name: manual_payment_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.manual_payment_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: moderation_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: moderation_short_ids; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.moderation_short_ids ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: pending_product_rejections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pending_product_rejections ENABLE ROW LEVEL SECURITY;

--
-- Name: pending_rejections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pending_rejections ENABLE ROW LEVEL SECURITY;

--
-- Name: playlists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

--
-- Name: podcasts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: promo_code_usages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promo_code_usages ENABLE ROW LEVEL SECURITY;

--
-- Name: promo_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_earnings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

--
-- Name: reputation_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reputation_history ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_pricing; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_pricing ENABLE ROW LEVEL SECURITY;

--
-- Name: support_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

--
-- Name: user_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;

--
-- Name: user_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;