import type { APIRoute } from "astro";

import { supabase } from "../../../lib/supabase";

export const prerender = false;

// GET - 목록 조회
export const GET: APIRoute = async () => {
  const { data, error } = await supabase
    .from("edu100_covers")
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

// POST - 새 표지 생성
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  const {
    title,
    subtitle,
    description,
    image,
    thumbnails,
    tag,
    linked_product_id,
    is_published,
    sort_order,
    fields,
    design_fee,
    section_id,
  } = body;

  if (!title) {
    return new Response(JSON.stringify({ message: "제목은 필수입니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabase
    .from("edu100_covers")
    .insert([
      {
        title,
        subtitle: subtitle || "",
        description: description || "",
        image: image || "",
        thumbnails: thumbnails || [],
        tag: tag || "",
        linked_product_id: linked_product_id || null,
        is_published: is_published ?? false,
        sort_order: sort_order ?? 0,
        fields: fields || [],
        design_fee: design_fee ?? 0,
        section_id: section_id || null,
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
