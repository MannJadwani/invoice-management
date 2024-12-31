-- Add team_id to invoices
ALTER TABLE public.invoices
ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Update RLS policies for invoices
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
CREATE POLICY "Users can view their own or team invoices" ON public.invoices
FOR SELECT USING (
  auth.uid() = user_id OR 
  team_id IN (
    SELECT id FROM public.teams WHERE owner_id = auth.uid()
    UNION
    SELECT team_id FROM public.profiles WHERE id = auth.uid() AND team_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
CREATE POLICY "Users can update their own or team invoices" ON public.invoices
FOR UPDATE USING (
  auth.uid() = user_id OR 
  team_id IN (
    SELECT id FROM public.teams WHERE owner_id = auth.uid()
    UNION
    SELECT team_id FROM public.profiles WHERE id = auth.uid() AND team_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;
CREATE POLICY "Users can delete their own or team invoices" ON public.invoices
FOR DELETE USING (
  auth.uid() = user_id OR 
  team_id IN (
    SELECT id FROM public.teams WHERE owner_id = auth.uid()
    UNION
    SELECT team_id FROM public.profiles WHERE id = auth.uid() AND team_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.invoices;
CREATE POLICY "Users can insert invoices for themselves or their team" ON public.invoices
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR 
  team_id IN (
    SELECT id FROM public.teams WHERE owner_id = auth.uid()
    UNION
    SELECT team_id FROM public.profiles WHERE id = auth.uid() AND team_id IS NOT NULL
  )
); 