-- Remove deprecated post-level featured image support.
-- Course-level featured_image remains untouched on public.courses.
ALTER TABLE public.posts
  DROP COLUMN IF EXISTS featured_image;
