import type { APIRoute } from "astro";

import { VALID_PRODUCT_TYPES } from "../../../lib/builderData";
import { supabase } from "../../../lib/supabase";

export const prerender = false;

// GET - 단일 조회
export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  const { data, error } = await supabase
    .from("products")
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

  if (!name) {
    return new Response(JSON.stringify({ message: "상품명은 필수입니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Safeguard S4: product_type null/invalid 거부
  if (!product_type || !VALID_PRODUCT_TYPES.includes(product_type)) {
    return new Response(
      JSON.stringify({
        message: `product_type 필수. 유효값: ${VALID_PRODUCT_TYPES.join(", ")}. 받은 값: "${product_type || "null"}"`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { data, error } = await supabase
    .from("products")
    .update({
      name,
      slug: slug || null,
      description: description || "",
      main_image: main_image || null,
      icon: icon || "📄",
      sort_order: sort_order ?? 0,
      content: content || {},
      blocks: blocks || [],
      product_type,
      is_published: is_published ?? true,
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

  const { error } = await supabase.from("products").delete().eq("id", id);

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
