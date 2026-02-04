import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_URL) || 'https://zqtmzbcfzozgzspslccp.supabase.co';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxdG16YmNmem96Z3pzcHNsY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzM2NjAsImV4cCI6MjA4NTI0OTY2MH0.H7w5s_8sSm-_-oU8Ft9fZah6i4NjC6GqQ-GoR3_8MVo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface News {
  id: string;
  title: string;
  category: string;
  pub_date: string;
  content: string;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export interface Work {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  image: string;
  pub_date: string;
  content: string;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

// Helper functions
export async function getNews() {
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('pub_date', { ascending: false });
  
  if (error) throw error;
  return data as News[];
}

export async function getNewsById(id: string) {
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as News;
}

export async function createNews(news: Partial<News>) {
  const { data, error } = await supabase
    .from('news')
    .insert([news])
    .select()
    .single();
  
  if (error) throw error;
  return data as News;
}

export async function updateNews(id: string, news: Partial<News>) {
  const { data, error } = await supabase
    .from('news')
    .update(news)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as News;
}

export async function deleteNews(id: string) {
  const { error } = await supabase
    .from('news')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}
