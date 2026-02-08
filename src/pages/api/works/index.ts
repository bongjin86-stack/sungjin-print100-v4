import type { APIRoute } from "astro";

import { supabase } from "../../../lib/supabase";

export const prerender = false;

// GET - 목록 조회
export const GET: APIRoute = async () => {
  const { data, error } = await supabase
    .from("works")
    .select("*")
    .order("created_at", { ascending: false });

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

// POST - 새 가이드 생성
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  const {
    title,
    subtitle,
    description,
    client,
    category_id,
    year,
    tag,
    content,
    image,
    overview,
    support,
    achievements,
    is_published,
  } = body;

  if (!title) {
    return new Response(JSON.stringify({ message: "제목은 필수입니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabase
    .from("works")
    .insert([
      {
        title,
        subtitle: subtitle || "",
        description: description || "",
        client: client || "",
        category_id: category_id || null,
        year: year || new Date().getFullYear().toString(),
        tag: tag || "",
        content: content || "",
        image: image || "",
        overview: overview || "",
        support: support || [],
        achievements: achievements || [],
        is_published: is_published ?? true,
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
