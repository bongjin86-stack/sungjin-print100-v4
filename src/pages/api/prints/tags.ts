import type { APIRoute } from "astro";

import { supabase } from "../../../lib/supabase";

export const prerender = false;

// GET - 고유 태그 목록 조회
export const GET: APIRoute = async () => {
  const { data, error } = await supabase
    .from("prints")
    .select("tag")
    .neq("tag", "")
    .not("tag", "is", null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const uniqueTags = [...new Set(
    (data || []).map((p) => p.tag).filter(Boolean)
  )].sort();

  return new Response(JSON.stringify(uniqueTags), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

// PUT - 태그 이름 변경 (해당 태그 사용하는 모든 prints 일괄 업데이트)
export const PUT: APIRoute = async ({ request }) => {
  const { oldTag, newTag } = await request.json();

  if (!oldTag || !newTag) {
    return new Response(
      JSON.stringify({ message: "oldTag, newTag 모두 필요합니다." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { error } = await supabase
    .from("prints")
    .update({ tag: newTag })
    .eq("tag", oldTag);

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

// DELETE - 태그 삭제 (해당 태그 사용하는 모든 prints에서 태그 제거)
export const DELETE: APIRoute = async ({ request }) => {
  const { tag } = await request.json();

  if (!tag) {
    return new Response(
      JSON.stringify({ message: "tag가 필요합니다." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { error } = await supabase
    .from("prints")
    .update({ tag: "" })
    .eq("tag", tag);

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
