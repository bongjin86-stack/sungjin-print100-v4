import type { APIRoute } from "astro";

import { supabase } from "../../../lib/supabase";

export const prerender = false;

// GET - 옵션 라이브러리 목록
export const GET: APIRoute = async () => {
  const { data, error } = await supabase
    .from("addon_options")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

// POST - 새 옵션 등록
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  const { label, description, price } = body;

  if (!label) {
    return new Response(JSON.stringify({ message: "라벨은 필수입니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabase
    .from("addon_options")
    .insert([
      {
        label,
        description: description || "",
        price: price || 0,
      },
    ])
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
