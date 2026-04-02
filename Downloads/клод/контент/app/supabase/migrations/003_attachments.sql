-- Add attachments column to content_slots
ALTER TABLE content_slots ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Create Storage bucket for slot attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('slot-attachments', 'slot-attachments', true)
ON CONFLICT DO NOTHING;
