import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  // Find in Supabase project dashboard > Project Settings > Data API
  'https://hseukcyyqsgfjrosdhyp.supabase.co',
  // Find in Supabase project dashboard > Project Settings > API Keys
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZXVrY3l5cXNnZmpyb3NkaHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3ODA1NDcsImV4cCI6MjA3MzM1NjU0N30.YdPJBtwsp4pf3SiwK_e1jYAYc0PzT8vKX2VE1yr2EAE'
);
