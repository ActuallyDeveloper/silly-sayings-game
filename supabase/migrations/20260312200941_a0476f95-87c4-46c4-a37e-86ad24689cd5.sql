
-- Create storage bucket for chat media
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true);

-- Allow authenticated users to upload to chat-media
CREATE POLICY "Authenticated users can upload chat media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow anyone to view chat media
CREATE POLICY "Anyone can view chat media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-media');

-- Allow users to delete their own media
CREATE POLICY "Users can delete own chat media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);
