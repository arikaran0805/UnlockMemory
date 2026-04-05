-- Remove post-only version note support while preserving course version notes.

-- Recreate trigger function without version note lock dependencies.
CREATE OR REPLACE FUNCTION public.ensure_single_published_version()
RETURNS TRIGGER AS $$
BEGIN
  -- When publishing a version, archive all other published versions for this post.
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    UPDATE public.post_versions
    SET status = 'archived'
    WHERE post_id = NEW.post_id
      AND id != NEW.id
      AND status = 'published';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Remove post-version-note columns.
ALTER TABLE public.post_versions
  DROP COLUMN IF EXISTS change_summary,
  DROP COLUMN IF EXISTS versioning_note_type,
  DROP COLUMN IF EXISTS versioning_note_locked;
