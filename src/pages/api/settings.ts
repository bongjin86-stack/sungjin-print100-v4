import type { APIRoute } from "astro";

import { supabase } from "../../lib/supabase";

export const prerender = false;

// site_settings 테이블은 key/value 구조
// key: 설정 키 (예: 'site_name', 'about_strength_visible')
// value: 설정 값

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    // 단일 key/value 저장 (AboutPageForm 등에서 사용)
    if (data.key && data.value !== undefined) {
      const { error } = await supabase.from("site_settings").upsert(
        {
          key: data.key,
          value: data.value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

      if (error) {
        console.error("Single setting save error:", error);
        throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 기존 방식: 여러 설정을 한 번에 저장 (설정 페이지에서 사용)
    const settings = [
      { key: "site_name", value: data.site_name || "" },
      { key: "site_description", value: data.site_description || "" },
      { key: "service_intro", value: data.service_intro || "" },
      // 사업장 정보
      { key: "company_name", value: data.company_name || "" },
      { key: "ceo_name", value: data.ceo_name || "" },
      { key: "business_number", value: data.business_number || "" },
      { key: "ecommerce_license", value: data.ecommerce_license || "" },
      { key: "privacy_officer", value: data.privacy_officer || "" },
      { key: "phone", value: data.phone || "" },
      { key: "email", value: data.email || "" },
      { key: "address", value: data.address || "" },
      { key: "google_maps_url", value: data.google_maps_url || "" },
      { key: "business_hours", value: data.business_hours || "" },
      {
        key: "business_hours_weekend",
        value: data.business_hours_weekend || "",
      },
      { key: "bank_name", value: data.bank_name || "" },
      { key: "bank_account", value: data.bank_account || "" },
      { key: "bank_account_holder", value: data.bank_account_holder || "" },
    ];

    const now = new Date().toISOString();
    const upsertData = settings
      .filter((s) => s.value !== undefined)
      .map((s) => ({ key: s.key, value: s.value, updated_at: now }));

    const { error: batchError } = await supabase
      .from("site_settings")
      .upsert(upsertData, { onConflict: "key" });

    if (batchError) {
      console.error("Batch settings save error:", batchError);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Settings save error:", error);
    return new Response(JSON.stringify({ error: "Failed to save settings" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value");

    if (error) {
      throw error;
    }

    // key/value 배열을 객체로 변환
    const settings: Record<string, string> = {};
    if (data) {
      for (const item of data) {
        settings[item.key] = item.value || "";
      }
    }

    return new Response(JSON.stringify(settings), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Settings fetch error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch settings" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
