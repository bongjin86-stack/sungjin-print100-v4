import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

// site_settings 테이블은 key/value 구조
// key: 설정 키 (예: 'site_name', 'about_strength_visible')
// value: 설정 값

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    
    // 단일 key/value 저장 (AboutPageForm 등에서 사용)
    if (data.key && data.value !== undefined) {
      const { error } = await supabase
        .from('site_settings')
        .upsert(
          { key: data.key, value: data.value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      
      if (error) {
        console.error('Single setting save error:', error);
        throw error;
      }
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 기존 방식: 여러 설정을 한 번에 저장 (설정 페이지에서 사용)
    const settings = [
      { key: 'site_name', value: data.site_name || '' },
      { key: 'site_description', value: data.site_description || '' },
      { key: 'contact_email', value: data.contact_email || '' },
      { key: 'contact_phone', value: data.contact_phone || '' },
      { key: 'contact_address', value: data.contact_address || '' },
      { key: 'service_intro', value: data.service_intro || '' }
    ];

    for (const setting of settings) {
      if (setting.value !== undefined) {
        const { error } = await supabase
          .from('site_settings')
          .upsert(
            { key: setting.key, value: setting.value, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          );
        
        if (error) {
          console.error(`Setting save error for ${setting.key}:`, error);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Settings save error:', error);
    return new Response(JSON.stringify({ error: 'Failed to save settings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value');

    if (error) {
      throw error;
    }

    // key/value 배열을 객체로 변환
    const settings: Record<string, string> = {};
    if (data) {
      for (const item of data) {
        settings[item.key] = item.value || '';
      }
    }

    return new Response(JSON.stringify(settings), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch settings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
