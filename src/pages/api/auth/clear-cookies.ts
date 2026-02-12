import type { APIRoute } from "astro";

export const prerender = false;

/**
 * POST /api/auth/clear-cookies
 * 로그아웃 시 httpOnly 쿠키 제거
 */
export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete("sb-access-token", { path: "/" });
  cookies.delete("sb-refresh-token", { path: "/" });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
