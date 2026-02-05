export const prerender = false;

import type { APIRoute } from 'astro';

import { supabase } from '@/lib/supabase';

export const GET: APIRoute = async ({ params }) => {
  const { data, error } = await supabase
    .from('company_values')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify(data), { status: 200 });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const body = await request.json();
  const { data, error } = await supabase
    .from('company_values')
    .update(body)
    .eq('id', params.id)
    .select();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify(data), { status: 200 });
};

export const DELETE: APIRoute = async ({ params }) => {
  const { error } = await supabase
    .from('company_values')
    .delete()
    .eq('id', params.id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
