import type { APIRoute } from "astro";

import { supabase } from "../../../../lib/supabase";

export const prerender = false;

// GET - 섹션 목록 (커버 포함)
export const GET: APIRoute = async () => {
  const { data: sections, error } = await supabase
    .from("edu100_sections")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 각 섹션별 커버 조회
  const sectionIds = (sections || []).map((s) => s.id);
  const { data: covers } = await supabase
    .from("edu100_covers")
    .select("*")
    .in("section_id", sectionIds)
    .order("sort_order", { ascending: true });

  // 섹션에 커버 매핑
  const result = (sections || []).map((section) => ({
    ...section,
    covers: (covers || []).filter((c) => c.section_id === section.id),
  }));

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

// POST - 새 섹션 생성
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { title, type, content, sort_order, is_published } = body;

  const { data, error } = await supabase
    .from("edu100_sections")
    .insert([
      {
        title: title || "",
        type: type || "gallery",
        content: content || "",
        sort_order: sort_order ?? 0,
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
