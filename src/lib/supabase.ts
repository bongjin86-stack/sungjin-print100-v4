import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase] Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY env vars');
}

// Build-time placeholder: createClient requires a valid URL string.
// At runtime, env vars are loaded from .env.local or hosting provider.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
);

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
 * 이미지 업로드 (서버 /api/upload 경유 — 파일 검증 포함)
 * @param file - 업로드할 파일
 * @param folder - 저장 폴더 (예: 'papers', 'products', 'hero')
 * @returns 공개 URL
 */
export async function uploadImage(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '업로드에 실패했습니다.');
  return `${data.url}?t=${Date.now()}`;
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
 * 주문 인쇄 파일 업로드 (서버 /api/upload 경유 — 파일 검증 포함)
 */
export async function uploadOrderFile(file: File, _orderId: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'orders');

  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '파일 업로드에 실패했습니다.');

  return {
    url: data.url,
    path: data.path,
    fileName: file.name,
    fileSize: file.size,
  };
}

/**
 * 주문 파일 삭제
 */
export async function deleteOrderFile(path: string) {
  const { error } = await supabase.storage.from('images').remove([path]);
  if (error) throw error;
}
