import type { APIRoute } from "astro";

import { supabase } from "../../../lib/supabase";

export const prerender = false;

// 한글 제목을 URL-safe slug로 변환
function generateSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\sㄱ-ㅎ가-힣-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 100);
}

// POST - 새 블로그 포스트 생성
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { title, excerpt, content, image, tags, is_published, pub_date } = body;

    if (!title || !content) {
      return new Response(
        JSON.stringify({ message: "제목과 내용을 입력해주세요." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // slug 생성 (중복 시 숫자 붙임)
    let slug = generateSlug(title);
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("slug")
      .like("slug", `${slug}%`);

    if (existing && existing.length > 0) {
      slug = `${slug}-${existing.length}`;
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .insert([{
        title,
        slug,
        excerpt: excerpt || "",
        content,
        image: image || "",
        tags: tags || [],
        is_published: is_published ?? false,
        pub_date: pub_date || new Date().toISOString().split("T")[0],
      }])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return new Response(
        JSON.stringify({ message: "저장에 실패했습니다.", error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ message: "저장되었습니다.", data }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({ message: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// GET - 블로그 포스트 목록 조회
export const GET: APIRoute = async ({ url }) => {
  try {
    const publishedOnly = url.searchParams.get("published") === "true";

    let query = supabase
      .from("blog_posts")
      .select("*")
      .order("pub_date", { ascending: false });

    if (publishedOnly) {
      query = query.eq("is_published", true);
    }

    const { data, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ message: "조회에 실패했습니다.", error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ message: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
