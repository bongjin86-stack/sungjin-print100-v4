import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

// POST - 새 공지사항 생성
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { title, category, pub_date, content } = body;

    if (!title || !category || !pub_date || !content) {
      return new Response(
        JSON.stringify({ message: '필수 항목을 모두 입력해주세요.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabase
      .from('news')
      .insert([{ title, category, pub_date, content }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return new Response(
        JSON.stringify({ message: '저장에 실패했습니다.', error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message: '저장되었습니다.', data }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ message: '서버 오류가 발생했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET - 공지사항 목록 조회
export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .order('pub_date', { ascending: false });

    if (error) {
      return new Response(
        JSON.stringify({ message: '조회에 실패했습니다.', error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ message: '서버 오류가 발생했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
