import type { APIRoute } from "astro";

import { supabase } from "../../../lib/supabase";

export const prerender = false;

// GET - 공개 상품 목록 조회 (is_published 필터)
export const GET: APIRoute = async ({ request, cookies }) => {
  const url = new URL(request.url);
  const includeAll = url.searchParams.get("all") === "1";

  // ?all=1은 관리자 전용 — 인증 검증
  if (includeAll) {
    const accessToken =
      cookies.get("sb-access-token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    // 토큰 유효성 실제 검증
    const { data: userData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  let query = supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true });

  if (!includeAll) {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query;

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
