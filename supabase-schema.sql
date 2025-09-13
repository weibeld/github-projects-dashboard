-- Supabase Database Schema for GitHub Projects Dashboard
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create statuses table
CREATE TABLE IF NOT EXISTS statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_system BOOLEAN DEFAULT false, -- For 'No Status' and 'Closed' which can't be deleted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, title)
);

-- Create labels table
CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, title)
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, -- GitHub Project ID
  user_id TEXT NOT NULL,
  status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL DEFAULT 0, -- For ordering within a status column
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(id, user_id)
);

-- Create project_labels junction table (many-to-many)
CREATE TABLE IF NOT EXISTS project_labels (
  project_id TEXT NOT NULL,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (project_id, label_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_statuses_user_id ON statuses(user_id);
CREATE INDEX idx_labels_user_id ON labels(user_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status_id ON projects(status_id);
CREATE INDEX idx_project_labels_project_id ON project_labels(project_id);
CREATE INDEX idx_project_labels_label_id ON project_labels(label_id);

-- Enable Row Level Security
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_labels ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see and modify their own data

-- Statuses policies
CREATE POLICY "Users can view own statuses" ON statuses
  FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'user_name') = user_id);

CREATE POLICY "Users can insert own statuses" ON statuses
  FOR INSERT WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'user_name') = user_id);

CREATE POLICY "Users can update own statuses" ON statuses
  FOR UPDATE USING ((auth.jwt() -> 'user_metadata' ->> 'user_name') = user_id);

CREATE POLICY "Users can delete own non-system statuses" ON statuses
  FOR DELETE USING (
    (auth.jwt() -> 'user_metadata' ->> 'user_name') = user_id
    AND is_system = false
  );

-- Labels policies
CREATE POLICY "Users can view own labels" ON labels
  FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'user_name') = user_id);

CREATE POLICY "Users can insert own labels" ON labels
  FOR INSERT WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'user_name') = user_id);

CREATE POLICY "Users can update own labels" ON labels
  FOR UPDATE USING ((auth.jwt() -> 'user_metadata' ->> 'user_name') = user_id);

CREATE POLICY "Users can delete own labels" ON labels
  FOR DELETE USING ((auth.jwt() -> 'user_metadata' ->> 'user_name') = user_id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'user_name') = user_id);

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'user_name') = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING ((auth.jwt() -> 'user_metadata' ->> 'user_name') = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING ((auth.jwt() -> 'user_metadata' ->> 'user_name') = user_id);

-- Project labels policies
CREATE POLICY "Users can view own project labels" ON project_labels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_labels.project_id
      AND projects.user_id = (auth.jwt() -> 'user_metadata' ->> 'user_name')
    )
  );

CREATE POLICY "Users can insert own project labels" ON project_labels
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_labels.project_id
      AND projects.user_id = (auth.jwt() -> 'user_metadata' ->> 'user_name')
    )
  );

CREATE POLICY "Users can delete own project labels" ON project_labels
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_labels.project_id
      AND projects.user_id = (auth.jwt() -> 'user_metadata' ->> 'user_name')
    )
  );

-- Function to initialize default statuses for a new user
CREATE OR REPLACE FUNCTION initialize_user_statuses(p_user_id TEXT)
RETURNS void AS $$
DECLARE
  no_status_id UUID;
  closed_id UUID;
BEGIN
  -- Check if user already has statuses
  IF EXISTS (SELECT 1 FROM statuses WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;

  -- Create 'No Status' status
  INSERT INTO statuses (user_id, title, position, is_system)
  VALUES (p_user_id, 'No Status', 0, true)
  RETURNING id INTO no_status_id;

  -- Create 'Closed' status
  INSERT INTO statuses (user_id, title, position, is_system)
  VALUES (p_user_id, 'Closed', 1, true)
  RETURNING id INTO closed_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create status ID
CREATE OR REPLACE FUNCTION get_or_create_status_id(p_user_id TEXT, p_title TEXT)
RETURNS UUID AS $$
DECLARE
  status_id UUID;
BEGIN
  SELECT id INTO status_id FROM statuses
  WHERE user_id = p_user_id AND title = p_title;

  IF status_id IS NULL THEN
    INSERT INTO statuses (user_id, title, position, is_system)
    VALUES (p_user_id, p_title,
      (SELECT COALESCE(MAX(position), -1) + 1 FROM statuses WHERE user_id = p_user_id),
      p_title IN ('No Status', 'Closed')
    )
    RETURNING id INTO status_id;
  END IF;

  RETURN status_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;