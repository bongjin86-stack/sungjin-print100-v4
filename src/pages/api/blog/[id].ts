import type { APIRoute } from "astro";

import { supabase } from "../../../lib/supabase";

export const prerender = false;

// GET - 단일 블로그 포스트 조회
export const GET: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ message: "조회에 실패했습니다.", error: error.message }),
        { status: 404, headers: { "Content-Type": "application/json" } }
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

// PUT - 블로그 포스트 수정
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, excerpt, content, image, tags, is_published, pub_date, section_id } = body;

    if (!title || !content) {
      return new Response(
        JSON.stringify({ message: "제목과 내용을 입력해주세요." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const updateData: Record<string, any> = {
      title,
      excerpt: excerpt || "",
      content,
      image: image || "",
      tags: tags || [],
      is_published: is_published ?? false,
      pub_date: pub_date || new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    };
    // section_id가 명시적으로 전달된 경우에만 업데이트 (null 허용)
    if (section_id !== undefined) {
      updateData.section_id = section_id;
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return new Response(
        JSON.stringify({ message: "수정에 실패했습니다.", error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ message: "수정되었습니다.", data }), {
      status: 200,
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

// PATCH - 부분 업데이트 (section_id 배정/해제 등)
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;
    const body = await request.json();

    // 허용된 필드만 업데이트
    const allowedFields = ["section_id", "is_published", "sort_order"];
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return new Response(
        JSON.stringify({ message: "수정에 실패했습니다.", error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ message: "수정되었습니다.", data }), {
      status: 200,
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

// DELETE - 블로그 포스트 삭제
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    const { error } = await supabase.from("blog_posts").delete().eq("id", id);

    if (error) {
      console.error("Supabase error:", error);
      return new Response(
        JSON.stringify({ message: "삭제에 실패했습니다.", error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ message: "삭제되었습니다." }), {
      status: 200,
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
