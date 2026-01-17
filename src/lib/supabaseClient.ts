import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Use environment variables if available, otherwise fallback to info.tsx constants
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || publicAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const tables = {
  profiles: 'profiles',
  sessions: 'sessions',
  session_requests: 'session_requests',
  reviews: 'reviews',
  notifications: 'notifications',
  mentorship_requests: 'mentorship_requests',
  blog_posts: 'blog_posts',
  achievements: 'achievements',
} as const;
