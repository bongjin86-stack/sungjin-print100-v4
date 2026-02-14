/**
 * Layout Cache — Header/Footer/SiteLogo 공통 DB 쿼리 메모리 캐시
 * ============================================================
 * 모든 페이지에서 매번 실행되는 3개 DB 쿼리를 서버 메모리에 캐시.
 * TTL 기반 자동 갱신 (기본 5분).
 */

import { supabase } from "./supabase";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// 서비스 목록 (Header 드롭다운)
let servicesCache: CacheEntry<Array<{ title: string; slug: string }>> | null =
  null;

// 사이트 설정 (Footer 회사정보)
let siteSettingsCache: CacheEntry<Record<string, string>> | null = null;

// 로고 URL (SiteLogo)
let logoCache: CacheEntry<string | null> | null = null;

// 헤더 숨김 메뉴 (Header 필터링)
let headerHiddenCache: CacheEntry<string[]> | null = null;

function isExpired(entry: CacheEntry<unknown> | null): boolean {
  if (!entry) return true;
  return Date.now() - entry.timestamp > CACHE_TTL_MS;
}

/**
 * Header용 서비스 목록 (캐시)
 */
export async function getServices(): Promise<
  Array<{ title: string; slug: string }>
> {
  if (!isExpired(servicesCache)) return servicesCache!.data;

  const { data } = await supabase
    .from("services")
    .select("title, slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const result = data || [];
  servicesCache = { data: result, timestamp: Date.now() };
  return result;
}

/**
 * Footer용 사이트 설정 (캐시)
 */
export async function getSiteSettings(): Promise<Record<string, string>> {
  if (!isExpired(siteSettingsCache)) return siteSettingsCache!.data;

  const { data } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", [
      "company_name",
      "ceo_name",
      "business_number",
      "ecommerce_license",
      "privacy_officer",
      "phone",
      "email",
      "address",
      "google_maps_url",
      "business_hours",
      "business_hours_weekend",
      "bank_name",
      "bank_account",
      "bank_account_holder",
    ]);

  const settings: Record<string, string> = {};
  data?.forEach((item: { key: string; value: string | null }) => {
    settings[item.key] = item.value || "";
  });

  siteSettingsCache = { data: settings, timestamp: Date.now() };
  return settings;
}

/**
 * SiteLogo용 로고 URL (캐시)
 */
export async function getLogoUrl(): Promise<string | null> {
  if (!isExpired(logoCache)) return logoCache!.data;

  let url: string | null = null;
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "logo_url")
      .single();
    if (data?.value) url = data.value;
  } catch {
    // 없으면 null
  }

  logoCache = { data: url, timestamp: Date.now() };
  return url;
}

/**
 * Header용 숨김 메뉴 경로 목록 (캐시)
 */
export async function getHeaderHiddenItems(): Promise<string[]> {
  if (!isExpired(headerHiddenCache)) return headerHiddenCache!.data;

  let items: string[] = [];
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "header_hidden_items")
      .single();
    if (data?.value) {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed)) items = parsed;
    }
  } catch {
    // 없으면 빈 배열
  }

  headerHiddenCache = { data: items, timestamp: Date.now() };
  return items;
}

/**
 * 캐시 초기화 (관리자가 설정 변경 시)
 */
export function clearLayoutCache(): void {
  servicesCache = null;
  siteSettingsCache = null;
  logoCache = null;
  headerHiddenCache = null;
}
