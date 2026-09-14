import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pccrsjjzzphecqfclmqj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjY3Jzamp6enBoZWNxZmNsbXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMTkzMzMsImV4cCI6MjEwNDg5NTMzM30.AvxVHyxxebOvORq8h0KsIl3U0bUrdlaZFGRZE3bgW6Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
