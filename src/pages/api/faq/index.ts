import type { APIRoute } from 'astro';

import { supabase } from '../../../lib/supabase';

export const prerender = false;

// GET - 목록 조회
export const GET: APIRoute = async () => {
  const { data, error } = await supabase
    .from('faq')
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

// POST - 새 FAQ 생성
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  
  const { question, answer, sort_order, is_active } = body;

  if (!question || !answer) {
    return new Response(JSON.stringify({ message: '질문과 답변은 필수입니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await supabase
    .from('faq')
    .insert([{
      question,
      answer,
      sort_order: sort_order || 0,
      is_active: is_active ?? true,
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
