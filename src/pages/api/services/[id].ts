import type { APIRoute } from "astro";

import { supabase } from "../../../lib/supabase";

export const prerender = false;

// GET - 단일 조회
export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

// PUT - 수정
export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params;
  const body = await request.json();

  const {
    slug,
    title,
    title_en,
    description,
    detail_description,
    image,
    tasks,
    sort_order,
    is_active,
    linked_product_id,
    order_button_text,
  } = body;

  if (!slug || !title) {
    return new Response(
      JSON.stringify({ message: "슬러그와 제목은 필수입니다." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { data, error } = await supabase
    .from("services")
    .update({
      slug,
      title,
      title_en: title_en || "",
      description: description || "",
      detail_description: detail_description || "",
      image: image || "",
      tasks: tasks || "[]",
      sort_order: sort_order || 1,
      is_active: is_active ?? true,
      linked_product_id: linked_product_id || null,
      order_button_text: order_button_text || "주문하기",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

// DELETE - 삭제
export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;

  const { error } = await supabase.from("services").delete().eq("id", id);

  if (error) {
    return new Response(JSON.stringify({ message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
