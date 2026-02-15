import type { APIRoute } from "astro";

export const prerender = false;

/**
 * 랜딩 페이지 CDN 캐시 무효화 API
 *
 * Vercel Cache-Tag 기반 무효화:
 * - index.astro에서 `Vercel-Cache-Tag: landing` 헤더 설정
 * - 이 엔드포인트가 Vercel API로 해당 태그 무효화 요청
 *
 * 필요 환경변수 (Vercel 대시보드에서 설정):
 * - VERCEL_API_TOKEN: Vercel 개인 액세스 토큰 (https://vercel.com/account/tokens)
 * - VERCEL_PROJECT_ID: 프로젝트 ID (프로젝트 설정 > General)
 * - VERCEL_TEAM_ID: 팀 ID (선택, 팀 프로젝트인 경우)
 */
export const POST: APIRoute = async () => {
  const token = import.meta.env.VERCEL_API_TOKEN;
  const projectId = import.meta.env.VERCEL_PROJECT_ID;
  const teamId = import.meta.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "캐시 퍼지 미설정 (VERCEL_API_TOKEN, VERCEL_PROJECT_ID 필요)",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const params = new URLSearchParams({ projectIdOrName: projectId });
    if (teamId) params.set("teamId", teamId);

    const res = await fetch(
      `https://api.vercel.com/v1/edge-cache/invalidate-by-tags?${params}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tags: ["landing"] }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Vercel cache purge failed:", res.status, text);
      return new Response(
        JSON.stringify({ success: false, message: "캐시 퍼지 실패" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Vercel cache purge error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "캐시 퍼지 오류" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
};
