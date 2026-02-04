# Supabase 테이블 구조 정보

## site_settings 테이블
```sql
CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key character varying(100) NOT NULL,
  value text NULL,
  description character varying(255) NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT site_settings_pkey PRIMARY KEY (id),
  CONSTRAINT site_settings_key_key UNIQUE (key)
)
```
**구조:** key-value 방식

---

## works 테이블
```sql
CREATE TABLE public.works (
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  title text NOT NULL,
  description text NULL,
  tag text NULL,
  image text NULL,
  content text NULL,
  is_published boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT works_pkey PRIMARY KEY (id)
)
```
**컬럼:**
- id: 고유 ID
- title: 제목
- description: 짧은 설명
- tag: 태그
- image: 이미지 URL
- content: 마크다운 본문
- is_published: 공개 여부

---

## faq 테이블
```sql
CREATE TABLE public.faq (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NULL DEFAULT 0,
  is_active boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT faq_pkey PRIMARY KEY (id)
)
```
**컬럼:**
- id: 고유 ID
- question: 질문
- answer: 답변
- sort_order: 정렬 순서
- is_active: 활성화 여부

---

## services 테이블
```sql
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug character varying(100) NOT NULL,
  title character varying(255) NOT NULL,
  title_en character varying(255) NULL,
  description text NULL,
  detail_description text NULL,
  image character varying(500) NULL,
  tasks jsonb NULL DEFAULT '[]'::jsonb,
  sort_order integer NULL DEFAULT 0,
  is_active boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT services_pkey PRIMARY KEY (id),
  CONSTRAINT services_slug_key UNIQUE (slug)
)
```
**컬럼:**
- id: 고유 ID
- slug: URL 슬러그 (예: wireless-binding)
- title: 제목 (한국어)
- title_en: 제목 (영어)
- description: 짧은 설명
- detail_description: 상세 설명
- image: 이미지 URL
- tasks: 제공 서비스 목록 (JSON 배열)
- sort_order: 정렬 순서
- is_active: 활성화 여부
