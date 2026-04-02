-- Enable RLS on announcement_bars
ALTER TABLE public.announcement_bars ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can read announcement bars
-- This is required for the public-facing bar to work without authentication
CREATE POLICY "Public can read announcement_bars"
  ON public.announcement_bars
  FOR SELECT
  USING (true);

-- Only admins can insert, update, and delete
CREATE POLICY "Admins can insert announcement_bars"
  ON public.announcement_bars
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update announcement_bars"
  ON public.announcement_bars
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete announcement_bars"
  ON public.announcement_bars
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
