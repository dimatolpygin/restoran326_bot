-- Content Planner DB Schema

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  niche TEXT NOT NULL,
  product TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  tone TEXT NOT NULL CHECK (tone IN ('expert', 'friendly', 'sales')),
  platforms TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Content Plans
CREATE TABLE IF NOT EXISTS content_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  posts_per_day INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rubrics
CREATE TABLE IF NOT EXISTS rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES content_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Content Slots
CREATE TABLE IF NOT EXISTS content_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES content_plans(id) ON DELETE CASCADE,
  rubric_id UUID REFERENCES rubrics(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('telegram', 'vk', 'instagram', 'x', 'youtube')),
  format TEXT NOT NULL DEFAULT 'post',
  topic TEXT,
  hook TEXT,
  cta TEXT,
  content TEXT,
  model_used TEXT,
  status TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea', 'draft', 'ready', 'published')),
  sources JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_plans_project_id ON content_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_rubrics_plan_id ON rubrics(plan_id);
CREATE INDEX IF NOT EXISTS idx_content_slots_plan_id ON content_slots(plan_id);
CREATE INDEX IF NOT EXISTS idx_content_slots_date ON content_slots(date);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to content_slots
DROP TRIGGER IF EXISTS content_slots_updated_at ON content_slots;
CREATE TRIGGER content_slots_updated_at
  BEFORE UPDATE ON content_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Also apply to projects and content_plans
DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS content_plans_updated_at ON content_plans;
CREATE TRIGGER content_plans_updated_at
  BEFORE UPDATE ON content_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
