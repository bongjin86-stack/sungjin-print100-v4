import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// Server-side Auth Middleware
// - /admin/* (except /admin/login): redirect to login
// - /api/* POST/PUT/DELETE/PATCH: 401 Unauthorized
// ============================================================

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Public POST endpoints (no auth required)
const PUBLIC_WRITE_PATHS = [
  '/api/calculate-price',
  '/api/create-order',
];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const method = context.request.method;

  // Determine if this route needs auth
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isProtectedApi =
    pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) &&
    !PUBLIC_WRITE_PATHS.some((p) => pathname.startsWith(p));

  if (!isAdminRoute && !isProtectedApi) {
    context.locals.user = null;
    return next();
  }

  // --- Token extraction ---
  // 1) Cookie (set on login, available for SSR page requests)
  // 2) Authorization header (for fetch() API calls from admin components)
  const cookieToken = context.cookies.get('sb-access-token')?.value;
  const headerToken = context.request.headers.get('Authorization')?.replace('Bearer ', '');
  const accessToken = cookieToken || headerToken;
  const refreshToken = context.cookies.get('sb-refresh-token')?.value;

  let user = null;

  // --- Verify access token ---
  if (accessToken && supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data } = await supabase.auth.getUser(accessToken);
      user = data?.user || null;
    } catch {
      // Token invalid or expired
    }
  }

  // --- Try refresh if access token failed ---
  if (!user && refreshToken && supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (data?.session) {
        user = data.session.user;
        // Update cookies with new tokens
        const secure = import.meta.env.PROD;
        // NOTE: httpOnly must be false — login.astro and AdminLayout.astro
        // set/read cookies via document.cookie (client-side JS).
        // httpOnly cookies can't be accessed by JS, causing duplicate cookies.
        context.cookies.set('sb-access-token', data.session.access_token, {
          path: '/',
          httpOnly: false,
          secure,
          sameSite: 'lax',
          maxAge: data.session.expires_in,
        });
        context.cookies.set('sb-refresh-token', data.session.refresh_token, {
          path: '/',
          httpOnly: false,
          secure,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
      }
    } catch {
      // Refresh failed
    }
  }

  // --- Deny access if not authenticated ---
  if (!user) {
    if (isAdminRoute) {
      return context.redirect('/admin/login');
    }
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  context.locals.user = user;
  return next();
});
