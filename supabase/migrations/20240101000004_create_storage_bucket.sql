-- Create a new storage bucket for invoice files
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-files', 'invoice-files', FALSE);

-- Enable RLS on the bucket
CREATE POLICY "Users can view their own invoice files"
ON storage.objects
FOR SELECT
USING (auth.uid() = owner);

CREATE POLICY "Users can upload invoice files"
ON storage.objects
FOR INSERT
WITH CHECK (
  auth.uid() = owner
  AND bucket_id = 'invoice-files'
);

CREATE POLICY "Users can update their own invoice files"
ON storage.objects
FOR UPDATE
USING (auth.uid() = owner)
WITH CHECK (bucket_id = 'invoice-files');

CREATE POLICY "Users can delete their own invoice files"
ON storage.objects
FOR DELETE
USING (auth.uid() = owner); 