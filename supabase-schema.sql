-- Supabase Database Schema for GitHub Projects Dashboard
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create columns table
CREATE TABLE IF NOT EXISTS columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_system BOOLEAN DEFAULT false, -- For 'No Status' and 'Closed' which can't be deleted
  sort_field TEXT DEFAULT 'number', -- Sorting field: title, number, items, updated, closed, created
  sort_direction TEXT DEFAULT 'desc', -- Sorting direction: asc, desc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, title),
  CHECK (sort_field IN ('title', 'number', 'items', 'updatedAt', 'closedAt', 'createdAt')),
  CHECK (sort_direction IN ('asc', 'desc'))
);

-- Create labels table
CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  color TEXT NOT NULL,
  text_color TEXT DEFAULT 'white' CHECK (text_color IN ('white', 'black')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, title)
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, -- GitHub Project ID
  user_id TEXT NOT NULL,
  column_id UUID NOT NULL REFERENCES columns(id) ON DELETE RESTRICT,
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
CREATE INDEX idx_columns_user_id ON columns(user_id);
CREATE INDEX idx_labels_user_id ON labels(user_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_column_id ON projects(column_id);
CREATE INDEX idx_project_labels_project_id ON project_labels(project_id);
CREATE INDEX idx_project_labels_label_id ON project_labels(label_id);

-- Enable Row Level Security
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_labels ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see and modify their own data

-- Columns policies
CREATE POLICY "Users can view own columns" ON columns
  FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'user_name') = user_id);

CREATE POLICY "Users can insert own columns" ON columns
  FOR INSERT WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'user_name') = user_id);

CREATE POLICY "Users can update own columns" ON columns
  FOR UPDATE USING ((auth.jwt() -> 'user_metadata' ->> 'user_name') = user_id);

CREATE POLICY "Users can delete own non-system columns" ON columns
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

-- Function to initialize default columns for a new user
CREATE OR REPLACE FUNCTION initialize_user_columns(p_user_id TEXT)
RETURNS void AS $$
DECLARE
  no_status_id UUID;
  closed_id UUID;
BEGIN
  -- Check if user already has columns
  IF EXISTS (SELECT 1 FROM columns WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;

  -- Create 'No Status' column
  INSERT INTO columns (user_id, title, position, is_system, sort_field, sort_direction)
  VALUES (p_user_id, 'No Status', 0, true, 'updatedAt', 'desc')
  RETURNING id INTO no_status_id;

  -- Create 'Closed' column
  INSERT INTO columns (user_id, title, position, is_system, sort_field, sort_direction)
  VALUES (p_user_id, 'Closed', 1, true, 'closedAt', 'desc')
  RETURNING id INTO closed_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create column ID
CREATE OR REPLACE FUNCTION get_or_create_column_id(p_user_id TEXT, p_title TEXT)
RETURNS UUID AS $$
DECLARE
  column_id UUID;
BEGIN
  SELECT id INTO column_id FROM columns
  WHERE user_id = p_user_id AND title = p_title;

  IF column_id IS NULL THEN
    INSERT INTO columns (user_id, title, position, is_system)
    VALUES (p_user_id, p_title,
      (SELECT COALESCE(MAX(position), -1) + 1 FROM columns WHERE user_id = p_user_id),
      p_title IN ('No Status', 'Closed')
    )
    RETURNING id INTO column_id;
  END IF;

  RETURN column_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;