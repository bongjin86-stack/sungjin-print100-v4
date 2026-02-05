// Site Config Service - 사이트 설정 관리
// ============================================================

import { supabase } from './supabase';

// 전역 캐시
let cachedConfig = null;

// 기본값 (DB 연결 실패 시 폴백)
const DEFAULT_CONFIG = {
  // 기본 정보
  'logo_url': '',
  'company_name': '(주)성진삼점오',
  'ceo_name': '',
  'business_number': '',
  'address': '서울 송파구 송파대로20길 22 다인빌딩 1층',

  // 연락처
  'phone': '02-448-3601',
  'email': 'hello@sungjinprint.com',

  // 결제 정보
  'bank_name': '하나은행',
  'bank_account': '585-910026-36407',
  'bank_holder': '(주)성진삼점오',

  // 배송비 설정
  'shipping_free_boxes': '1',
  'shipping_fee_per_box': '4000',

  // 이메일 설정 (Resend)
  'resend_api_key': '',
  'from_email': 'onboarding@resend.dev',
};

/**
 * Supabase에서 사이트 설정 로드
 * 한 번 로드 후 캐싱하여 재사용
 */
export async function loadSiteConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('*')
      .order('key');

    if (error) throw error;

    // key-value 맵으로 변환
    cachedConfig = { ...DEFAULT_CONFIG };
    if (data) {
      data.forEach(item => {
        cachedConfig[item.key] = item.value;
      });
    }

    return cachedConfig;

  } catch (error) {
    console.error('사이트 설정 로드 실패:', error);
    cachedConfig = { ...DEFAULT_CONFIG };
    return cachedConfig;
  }
}

/**
 * 특정 설정값 조회
 */
export function getConfig(key) {
  if (!cachedConfig) {
    console.warn('설정이 아직 로드되지 않았습니다. loadSiteConfig()를 먼저 호출하세요.');
    return DEFAULT_CONFIG[key] || '';
  }
  return cachedConfig[key] || DEFAULT_CONFIG[key] || '';
}

// 기본 정보 조회
export function getLogoUrl() { return getConfig('logo_url'); }
export function getCompanyName() { return getConfig('company_name'); }
export function getCeoName() { return getConfig('ceo_name'); }
export function getBusinessNumber() { return getConfig('business_number'); }
export function getAddress() { return getConfig('address'); }

// 연락처 조회
export function getPhone() { return getConfig('phone'); }
export function getEmail() { return getConfig('email'); }

// 결제 정보 조회
export function getBankName() { return getConfig('bank_name'); }
export function getBankAccount() { return getConfig('bank_account'); }
export function getBankHolder() { return getConfig('bank_holder'); }

export function getBankInfo() {
  return {
    bankName: getBankName(),
    bankAccount: getBankAccount(),
    bankHolder: getBankHolder(),
  };
}

// 배송비 설정 조회
export function getShippingFreeBoxes() {
  return parseInt(getConfig('shipping_free_boxes')) || 1;
}

export function getShippingFeePerBox() {
  return parseInt(getConfig('shipping_fee_per_box')) || 4000;
}

export function getShippingConfig() {
  return {
    freeBoxes: getShippingFreeBoxes(),
    feePerBox: getShippingFeePerBox(),
  };
}

// 설정 업데이트 (관리자용)
export async function updateConfig(key, value) {
  try {
    const { error } = await supabase
      .from('site_config')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    if (error) throw error;

    if (cachedConfig) {
      cachedConfig[key] = value;
    }

    return true;
  } catch (error) {
    console.error('설정 업데이트 실패:', error);
    throw error;
  }
}

export async function updateConfigs(configs) {
  try {
    const updates = Object.entries(configs).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('site_config')
      .upsert(updates, {
        onConflict: 'key'
      });

    if (error) throw error;

    if (cachedConfig) {
      Object.entries(configs).forEach(([key, value]) => {
        cachedConfig[key] = String(value);
      });
    }

    return true;
  } catch (error) {
    console.error('설정 일괄 업데이트 실패:', error);
    throw error;
  }
}

export function clearCache() {
  cachedConfig = null;
}

export async function getAllConfigs() {
  await loadSiteConfig();
  return { ...cachedConfig };
}
