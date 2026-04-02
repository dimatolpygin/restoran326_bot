-- Add attachments column to content_slots
ALTER TABLE content_slots ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Create Storage bucket for slot attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('slot-attachments', 'slot-attachments', true)
ON CONFLICT DO NOTHING;

-- Allow anon to upload, read, and delete from the bucket
CREATE POLICY "allow anon select" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'slot-attachments');

CREATE POLICY "allow anon insert" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'slot-attachments');

CREATE POLICY "allow anon delete" ON storage.objects
  FOR DELETE TO anon USING (bucket_id = 'slot-attachments');
