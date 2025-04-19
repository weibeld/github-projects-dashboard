import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  // Find in Supabase project dashboard > Project Settings > Data API
  'https://ptmcrrrrdsjgzfdawzkg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bWNycnJyZHNqZ3pmZGF3emtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwMDI4MzYsImV4cCI6MjA2MDU3ODgzNn0.E_jnXoiniR8-X_VBw3BebpeuBCSTGtZb5qgzMONcvDI'
);
