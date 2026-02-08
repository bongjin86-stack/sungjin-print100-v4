import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "./supabase";

// ============================================================
// 관리자 인증 서비스
// ============================================================

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * 이메일/비밀번호 로그인
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user ?? undefined };
}

/**
 * 로그아웃
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * 현재 세션 가져오기
 */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * 현재 사용자 가져오기
 */
export async function getUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * 인증 상태 확인
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * 관리자 권한 확인 (user_metadata.role === 'admin' 또는 모든 로그인 사용자)
 * 현재는 로그인만 확인 (추후 role 기반 권한 추가 가능)
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;

  // 현재는 로그인된 모든 사용자를 관리자로 간주
  // 추후 role 기반 권한 추가 시: return user.user_metadata?.role === 'admin';
  return true;
}

/**
 * 브라우저용 세션 리스너 설정
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}
