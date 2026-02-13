import type { APIRoute } from "astro";

import { supabase } from "../../../../lib/supabase";

export const prerender = false;

// GET - 단일 섹션 + 커버
export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  const { data: section, error } = await supabase
    .from("edu100_sections")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: covers } = await supabase
    .from("edu100_covers")
    .select("*")
    .eq("section_id", id)
    .order("sort_order", { ascending: true });

  return new Response(JSON.stringify({ ...section, covers: covers || [] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

// PUT - 섹션 수정
export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params;
  const body = await request.json();
  const { title, type, content, sort_order, is_published } = body;

  const { data, error } = await supabase
    .from("edu100_sections")
    .update({
      title: title || "",
      type: type || "gallery",
      content: content || "",
      sort_order: sort_order ?? 0,
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

// DELETE - 섹션 삭제 (소속 커버는 section_id = NULL)
export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;

  // 소속 커버의 section_id를 null로
  await supabase
    .from("edu100_covers")
    .update({ section_id: null })
    .eq("section_id", id);

  const { error } = await supabase.from("edu100_sections").delete().eq("id", id);

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
