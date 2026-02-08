// Site Config Service - 사이트 설정 관리
// ============================================================

import { supabase } from "./supabase";

export interface SiteConfig {
  [key: string]: string;
}

export interface BankInfo {
  bankName: string;
  bankAccount: string;
  bankHolder: string;
}

export interface ShippingConfig {
  freeBoxes: number;
  feePerBox: number;
}

// 전역 캐시
let cachedConfig: SiteConfig | null = null;

// 기본값 (DB 연결 실패 시 폴백)
const DEFAULT_CONFIG: SiteConfig = {
  // 기본 정보
  logo_url: "",
  company_name: "(주)성진삼점오",
  ceo_name: "",
  business_number: "",
  ecommerce_license: "",
  privacy_officer: "",
  address: "서울 송파구 송파대로20길 22 다인빌딩 1층",

  // 연락처
  phone: "02-448-3601",
  email: "hello@sungjinprint.com",

  // 결제 정보
  bank_name: "하나은행",
  bank_account: "585-910026-36407",
  bank_account_holder: "(주)성진삼점오",

  // 배송비 설정
  shipping_free_boxes: "1",
  shipping_fee_per_box: "4000",

  // 이메일 설정 (Resend)
  resend_api_key: "",
  from_email: "onboarding@resend.dev",

  // 랜딩 페이지 - About 섹션
  landing_about_text:
    "20년 경력의 인쇄 전문가가 운영하는\nSungjinprint입니다.\n\n무선제본, 중철제본, 스프링제본 등\n다양한 제본 서비스와 빠른 납기를 제공합니다.\n\n50부 이상 대량 주문 시 단가가 낮아지며,\n최신 장비로 깔끔한 인쇄 품질을 보장합니다.\n언제든 편하게 문의해 주세요.",

  // 랜딩 페이지 - CTA 섹션
  landing_cta_title: "Contact",
  landing_cta_subtitle: "문의하기",
  landing_cta_text:
    "견적 문의, 상담, 샘플 요청 등 무엇이든 편하게 문의해 주세요.",
  landing_cta_list:
    "책자, 카탈로그, 브로슈어 인쇄를 의뢰하고 싶다\n대량 인쇄 견적을 받고 싶다\n용지 선택이나 후가공에 대해 상담하고 싶다\n납기 일정을 확인하고 싶다\n용지 샘플을 받아보고 싶다 등",
  landing_cta_button_text: "문의하기",
  landing_cta_button_link: "/contact",
};

/**
 * Supabase에서 사이트 설정 로드 (site_settings 테이블 사용)
 * 한 번 로드 후 캐싱하여 재사용
 */
export async function loadSiteConfig(): Promise<SiteConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .order("key");

    if (error) throw error;

    // key-value 맵으로 변환
    cachedConfig = { ...DEFAULT_CONFIG };
    if (data) {
      data.forEach((item: { key: string; value: string }) => {
        if (item.value) {
          cachedConfig![item.key] = item.value;
        }
      });
    }

    return cachedConfig;
  } catch (error) {
    console.error("사이트 설정 로드 실패:", error);
    cachedConfig = { ...DEFAULT_CONFIG };
    return cachedConfig;
  }
}

/**
 * 특정 설정값 조회
 */
export function getConfig(key: string): string {
  if (!cachedConfig) {
    console.warn(
      "설정이 아직 로드되지 않았습니다. loadSiteConfig()를 먼저 호출하세요."
    );
    return DEFAULT_CONFIG[key] || "";
  }
  return cachedConfig[key] || DEFAULT_CONFIG[key] || "";
}

// 기본 정보 조회
export function getLogoUrl(): string {
  return getConfig("logo_url");
}
export function getCompanyName(): string {
  return getConfig("company_name");
}
export function getCeoName(): string {
  return getConfig("ceo_name");
}
export function getBusinessNumber(): string {
  return getConfig("business_number");
}
export function getAddress(): string {
  return getConfig("address");
}

// 연락처 조회
export function getPhone(): string {
  return getConfig("phone");
}
export function getEmail(): string {
  return getConfig("email");
}

// 결제 정보 조회
export function getBankName(): string {
  return getConfig("bank_name");
}
export function getBankAccount(): string {
  return getConfig("bank_account");
}
export function getBankHolder(): string {
  return getConfig("bank_account_holder");
}

export function getBankInfo(): BankInfo {
  return {
    bankName: getBankName(),
    bankAccount: getBankAccount(),
    bankHolder: getBankHolder(),
  };
}

// 배송비 설정 조회
export function getShippingFreeBoxes(): number {
  return parseInt(getConfig("shipping_free_boxes")) || 1;
}

export function getShippingFeePerBox(): number {
  return parseInt(getConfig("shipping_fee_per_box")) || 4000;
}

export function getShippingConfig(): ShippingConfig {
  return {
    freeBoxes: getShippingFreeBoxes(),
    feePerBox: getShippingFeePerBox(),
  };
}

// 설정 업데이트 (관리자용)
export async function updateConfig(
  key: string,
  value: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from("site_config").upsert(
      {
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "key",
      }
    );

    if (error) throw error;

    if (cachedConfig) {
      cachedConfig[key] = value;
    }

    return true;
  } catch (error) {
    console.error("설정 업데이트 실패:", error);
    throw error;
  }
}

export async function updateConfigs(
  configs: Record<string, string | number>
): Promise<boolean> {
  try {
    const updates = Object.entries(configs).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("site_config").upsert(updates, {
      onConflict: "key",
    });

    if (error) throw error;

    if (cachedConfig) {
      Object.entries(configs).forEach(([key, value]) => {
        cachedConfig![key] = String(value);
      });
    }

    return true;
  } catch (error) {
    console.error("설정 일괄 업데이트 실패:", error);
    throw error;
  }
}

export function clearCache(): void {
  cachedConfig = null;
}

export async function getAllConfigs(): Promise<SiteConfig> {
  await loadSiteConfig();
  return { ...cachedConfig! };
}
