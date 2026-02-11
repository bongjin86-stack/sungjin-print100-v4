import type { APIRoute } from "astro";

import { supabase } from "../../../lib/supabase";

export const prerender = false;

// PUT - 옵션 수정
export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params;
  const body = await request.json();

  const { label, description, price, is_active, sort_order } = body;

  if (!label) {
    return new Response(JSON.stringify({ message: "라벨은 필수입니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabase
    .from("addon_options")
    .update({
      label,
      description: description || "",
      price: price ?? 0,
      is_active: is_active ?? true,
      sort_order: sort_order ?? 0,
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

// DELETE - 옵션 삭제
export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;

  const { error } = await supabase.from("addon_options").delete().eq("id", id);

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
