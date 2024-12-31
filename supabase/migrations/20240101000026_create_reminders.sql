-- Create reminders table
CREATE TABLE public.reminders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own reminders and team reminders
CREATE POLICY "Users can view own reminders and team reminders"
ON public.reminders
FOR SELECT
USING (
    auth.uid() = user_id 
    OR team_id IN (
        SELECT team_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Policy for users to create reminders
CREATE POLICY "Users can create reminders"
ON public.reminders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own reminders
CREATE POLICY "Users can update own reminders"
ON public.reminders
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for users to delete their own reminders
CREATE POLICY "Users can delete own reminders"
ON public.reminders
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON public.reminders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 