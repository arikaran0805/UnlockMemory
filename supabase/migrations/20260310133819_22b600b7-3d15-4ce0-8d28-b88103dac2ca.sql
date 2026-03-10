ALTER TABLE public.tags DROP CONSTRAINT tags_author_id_fkey;
ALTER TABLE public.tags ADD CONSTRAINT tags_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;