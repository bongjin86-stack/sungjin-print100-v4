# Sungjin Print 사이트 현황 검토

## 로컬 확인 URL
**https://4321-iyocek6w1s4bc62qymi5i-7a02f538.sg1.manus.computer**

---

## 1. 프론트엔드 페이지 데이터 소스 현황

| 페이지 | 데이터 소스 | 렌더링 | 상태 |
|--------|------------|--------|------|
| **랜딩 (/)** | | | |
| - Works 섹션 | ✅ Supabase DB | SSR | ✅ 완료 |
| - News 섹션 | ❌ JSON (Content Collection) | SSG | ⚠️ 불일치 |
| - Services 섹션 | ✅ Supabase DB | SSR | ✅ 완료 |
| - FAQ 섹션 | ✅ Supabase DB | SSR | ✅ 완료 |
| **About (/about)** | | | |
| - History | ✅ Supabase DB | SSR | ✅ 완료 |
| - Team | ✅ Supabase DB | SSR | ✅ 완료 |
| - Values | ✅ Supabase DB | SSR | ✅ 완료 |
| **Services (/services)** | ✅ Supabase DB | SSR | ✅ 완료 |
| **Works** | | | |
| - 목록 (/works) | ✅ Supabase DB | SSR | ✅ 완료 |
| - 상세 (/works/[id]) | ✅ Supabase DB | SSR | ✅ 완료 |
| - 카테고리 필터 | ✅ Supabase DB | SSR | ✅ 완료 |
| **News** | | | |
| - index (/news) | ✅ Supabase DB | SSR | ✅ 완료 |
| - 목록 (/news/[...page]) | ❌ JSON (Content Collection) | SSG | ⚠️ 불일치 |
| - 상세 (/news/[id]) | ❌ JSON (Content Collection) | SSG | ⚠️ 불일치 |
| - 카테고리 필터 | ❌ JSON (Content Collection) | SSG | ⚠️ 불일치 |
| **Contact (/contact)** | 정적 | SSG | ✅ 완료 |

---

## 2. Admin 페이지 현황

| Admin 메뉴 | 목록 | 생성 | 수정 | 삭제 | 상태 |
|-----------|------|------|------|------|------|
| 공지사항 (News) | ✅ | ✅ | ✅ | ✅ | ✅ 완료 |
| 인쇄가이드 (Works) | ✅ | ✅ | ✅ | ✅ | ✅ 완료 |
| 서비스 (Services) | ✅ | ✅ | ✅ | ✅ | ✅ 완료 |
| FAQ | ✅ | ✅ | ✅ | ✅ | ✅ 완료 |
| 연혁 (History) | ✅ | ✅ | ✅ | ✅ | ✅ 완료 |
| 팀 (Team) | ✅ | ✅ | ✅ | ✅ | ✅ 완료 |
| 가치관 (Values) | ✅ | ✅ | ✅ | ✅ | ✅ 완료 |
| 설정 (Settings) | ✅ | - | ✅ | - | ✅ 완료 |

---

## 3. 문제점 및 개선 필요 사항

### ⚠️ News 페이지 데이터 불일치
- **문제:** News index는 DB에서 가져오지만, 목록/상세/카테고리 페이지는 JSON에서 가져옴
- **영향:** Admin에서 News 수정해도 일부 페이지에 반영 안 됨
- **해결:** Works처럼 모든 News 페이지를 DB 연동으로 변경 필요

### ⚠️ 랜딩 News 섹션 데이터 불일치
- **문제:** 랜딩 페이지 News 섹션이 Content Collection(JSON)에서 가져옴
- **영향:** Admin에서 News 수정해도 랜딩에 반영 안 됨
- **해결:** News.astro 컴포넌트를 DB 연동으로 변경 필요

---

## 4. 권장 작업 순서

1. **News 목록 페이지** (`/news/[...page].astro`) → DB 연동
2. **News 상세 페이지** (`/news/[id].astro`) → DB 연동
3. **News 카테고리 필터** (`/news/category/[category]/[...page].astro`) → DB 연동
4. **랜딩 News 섹션** (`News.astro`) → DB 연동
5. 테스트 및 검증

---

## 5. DB 테이블 현황

| 테이블 | 용도 | 상태 |
|--------|------|------|
| news | 공지사항 | ✅ 사용 중 |
| works | 인쇄가이드 | ✅ 사용 중 |
| work_categories | Works 카테고리 | ✅ 사용 중 |
| services | 서비스 | ✅ 사용 중 |
| faq | FAQ | ✅ 사용 중 |
| history | 연혁 | ✅ 사용 중 |
| team | 팀 | ✅ 사용 중 |
| team_intro | 팀 소개 | ✅ 사용 중 |
| values | 가치관 | ✅ 사용 중 |
| site_settings | 사이트 설정 | ✅ 사용 중 |
| landing_content | 랜딩 콘텐츠 | ✅ 사용 중 |
