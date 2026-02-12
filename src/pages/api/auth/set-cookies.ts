import type { APIRoute } from "astro";

export const prerender = false;

/**
 * POST /api/auth/set-cookies
 * 클라이언트에서 토큰을 받아 httpOnly 쿠키로 설정
 * Body: { access_token, refresh_token, expires_in }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { access_token, refresh_token, expires_in } = await request.json();

    if (!access_token || !refresh_token) {
      return new Response(JSON.stringify({ error: "Tokens required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const secure = import.meta.env.PROD;

    cookies.set("sb-access-token", access_token, {
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: expires_in || 3600,
    });

    cookies.set("sb-refresh-token", refresh_token, {
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to set cookies" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
