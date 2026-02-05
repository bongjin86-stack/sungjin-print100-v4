import type { APIRoute } from 'astro';

import { supabase } from '../../../lib/supabase';

export const prerender = false;

// GET - 목록 조회
export const GET: APIRoute = async () => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST - 새 서비스 생성
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  
  const { slug, title, title_en, description, detail_description, image, tasks, sort_order, is_active, linked_product_id, order_button_text } = body;

  if (!slug || !title) {
    return new Response(JSON.stringify({ message: '슬러그와 제목은 필수입니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await supabase
    .from('services')
    .insert([{
      slug,
      title,
      title_en: title_en || '',
      description: description || '',
      detail_description: detail_description || '',
      image: image || '',
      tasks: tasks || '[]',
      sort_order: sort_order || 1,
      is_active: is_active ?? true,
      linked_product_id: linked_product_id || null,
      order_button_text: order_button_text || '주문하기',
    }])
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
