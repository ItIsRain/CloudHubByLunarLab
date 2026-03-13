-- =====================================================
-- Blog posts for platform content
-- =====================================================

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (char_length(slug) BETWEEN 1 AND 200),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  excerpt TEXT NOT NULL CHECK (char_length(excerpt) BETWEEN 1 AND 500),
  content TEXT NOT NULL,
  cover_image TEXT,
  category TEXT NOT NULL CHECK (char_length(category) BETWEEN 1 AND 50),
  tags TEXT[] NOT NULL DEFAULT '{}',
  read_time INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  view_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_posts_author ON public.blog_posts(author_id);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status, published_at DESC);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category) WHERE status = 'published';

-- Trigger
CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts
CREATE POLICY "Published posts are public"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' OR auth.uid() = author_id);

-- Authors can create posts
CREATE POLICY "Authors can create posts"
  ON public.blog_posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Authors can update own posts
CREATE POLICY "Authors can update own posts"
  ON public.blog_posts FOR UPDATE
  USING (auth.uid() = author_id);

-- Authors can delete own posts
CREATE POLICY "Authors can delete own posts"
  ON public.blog_posts FOR DELETE
  USING (auth.uid() = author_id);
