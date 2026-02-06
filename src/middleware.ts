import { defineMiddleware } from 'astro:middleware';

// 인증 체크는 클라이언트 사이드에서 처리
// Supabase 기본 클라이언트는 localStorage에 세션을 저장하므로
// 서버 미들웨어에서는 세션을 읽을 수 없음

export const onRequest = defineMiddleware(async (_context, next) => {
  return next();
});
