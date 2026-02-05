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

// ============================================================
// Storage 헬퍼 함수
// ============================================================

/**
 * 이미지 업로드
 * @param path - 저장 경로 (예: 'papers/snow.jpg', 'products/flyer/main.jpg')
 * @param file - 업로드할 파일
 * @returns 공개 URL
 */
export async function uploadImage(path: string, file: File): Promise<string> {
  const { data, error } = await supabase.storage
    .from('images')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from('images').getPublicUrl(path);
  // 캐시 우회를 위해 타임스탬프 추가
  return `${urlData.publicUrl}?t=${Date.now()}`;
}

/**
 * 이미지 삭제
 * @param path - 삭제할 파일 경로
 */
export async function deleteImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from('images').remove([path]);
  if (error) throw error;
}

// ============================================================
// 주문 파일 업로드
// ============================================================

/**
 * 주문 인쇄 파일 업로드
 */
export async function uploadOrderFile(file: File, orderId: string) {
  const MAX_SIZE = 30 * 1024 * 1024; // 30MB

  if (file.size > MAX_SIZE) {
    throw new Error('파일 크기가 30MB를 초과합니다.');
  }

  const ext = file.name.split('.').pop();
  const safeName = `${orderId}_${Date.now()}.${ext}`;
  const path = `orders/${safeName}`;

  const { data, error } = await supabase.storage
    .from('images')
    .upload(path, file, { upsert: false });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from('images').getPublicUrl(path);

  return {
    url: urlData.publicUrl,
    path: path,
    fileName: file.name,
    fileSize: file.size
  };
}

/**
 * 주문 파일 삭제
 */
export async function deleteOrderFile(path: string) {
  const { error } = await supabase.storage.from('images').remove([path]);
  if (error) throw error;
}
