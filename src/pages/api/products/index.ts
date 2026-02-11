import type { APIRoute } from "astro";

import { supabase } from "../../../lib/supabase";

export const prerender = false;

// GET - 목록 조회
export const GET: APIRoute = async () => {
  const { data, error } = await supabase
    .from("products")
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

// POST - 새 상품 생성
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  const {
    id,
    name,
    slug,
    description,
    main_image,
    icon,
    sort_order,
    content,
    blocks,
    product_type,
    is_published,
  } = body;

  if (!id || !name) {
    return new Response(
      JSON.stringify({ message: "id와 name은 필수입니다." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { data, error } = await supabase
    .from("products")
    .upsert([
      {
        id,
        name,
        slug: slug || null,
        description: description || "",
        main_image: main_image || null,
        icon: icon || "📄",
        sort_order: sort_order ?? 0,
        content: content || {},
        blocks: blocks || [],
        product_type: product_type || null,
        is_published: is_published ?? true,
        updated_at: new Date().toISOString(),
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
