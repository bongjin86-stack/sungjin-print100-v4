import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.PUBLIC_SUPABASE_ANON_KEY
);

const businessInfo = [
  { key: 'company_name', value: '(주)성진삼점오', description: '회사명' },
  { key: 'ceo_name', value: '', description: '대표자명' },
  { key: 'business_number', value: '', description: '사업자등록번호' },
  { key: 'phone', value: '02-448-3601', description: '전화번호' },
  { key: 'email', value: '', description: '이메일' },
  { key: 'address', value: '서울 송파구 송파대로20길 22 다인빌딩 1층', description: '주소' },
  { key: 'google_maps_url', value: 'https://maps.app.goo.gl/avBn1jfpfq5CQLDs5', description: '구글맵 URL' },
  { key: 'business_hours', value: '평일 09:00 - 18:00', description: '운영시간' },
  { key: 'business_hours_weekend', value: '주말 및 공휴일 휴무', description: '주말 운영시간' },
  { key: 'bank_name', value: '하나은행', description: '은행명' },
  { key: 'bank_account', value: '585-910026-36407', description: '계좌번호' },
  { key: 'bank_account_holder', value: '(주)성진삼점오', description: '예금주' }
];

for (const item of businessInfo) {
  const { data, error } = await supabase
    .from('site_settings')
    .upsert(item, { onConflict: 'key' });
  
  if (error) {
    console.error(`Error adding ${item.key}:`, error);
  } else {
    console.log(`✅ Added: ${item.key} = ${item.value || '(빈 값)'}`);
  }
}

console.log('\n완료!');
