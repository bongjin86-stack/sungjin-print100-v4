import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zqtmzbcfzozgzspslccp.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxdG16YmNmem96Z3pzcHNsY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzM2NjAsImV4cCI6MjA4NTI0OTY2MH0.H7w5s_8sSm-_-oU8Ft9fZah6i4NjC6GqQ-GoR3_8MVo";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// FAQ 데이터
const faqData = [
  {
    question: "최소 주문 수량이 있나요?",
    answer:
      "네, 50부 이상부터 주문 가능합니다. 대량 주문 시 단가가 낮아지며, 100부, 500부, 1000부 단위로 추가 할인이 적용됩니다.",
    sort_order: 1,
  },
  {
    question: "납기는 얼마나 걸리나요?",
    answer:
      "일반적으로 3~5일 정도 소요됩니다. 급한 경우 당일 출고나 익일 배송 서비스도 가능합니다. 수량과 후가공에 따라 달라질 수 있으니 상담 시 확인해 주세요.",
    sort_order: 2,
  },
  {
    question: "어떤 파일 형식으로 보내야 하나요?",
    answer:
      "PDF 파일을 권장합니다. AI, PSD, 한글(HWP) 파일도 가능하지만, 폰트 깨짐이나 레이아웃 변경을 방지하기 위해 PDF로 변환 후 보내주시는 것이 좋습니다. 파일 제작 가이드를 참고해 주세요.",
    sort_order: 3,
  },
  {
    question: "용지 선택은 어떻게 하나요?",
    answer:
      "용도에 따라 추천 용지가 다릅니다. 책자는 모조지나 미색모조지, 카탈로그는 아트지나 스노우지를 많이 사용합니다. 용지 샘플을 무료로 보내드리니 상담 시 요청해 주세요.",
    sort_order: 4,
  },
  {
    question: "시안 확인이 가능한가요?",
    answer:
      "네, 인쇄 전 PDF 시안을 보내드립니다. 시안 확인 후 승인해 주시면 인쇄를 진행합니다. 수정이 필요한 경우 말씀해 주시면 반영해 드립니다.",
    sort_order: 5,
  },
];

// Services 데이터
const servicesData = [
  {
    slug: "wireless-binding",
    title: "무선제본",
    title_en: "Perfect Binding",
    description:
      "50부 이상 대량 주문 시 단가가 낮아집니다. 책자, 카탈로그, 보고서에 적합합니다.",
    detail_description:
      "무선제본은 책등에 접착제를 사용하여 내지를 표지에 붙이는 방식입니다. 깔끔하고 전문적인 마감으로 책자, 카탈로그, 보고서, 논문집 등에 널리 사용됩니다. 50부 이상 대량 주문 시 단가가 크게 낮아지며, 최신 장비로 빠르고 정확한 제본을 제공합니다.",
    image: "/images/services/wireless-binding.jpg",
    tasks: [
      "책자/단행본 제본",
      "카탈로그/브로슈어",
      "회사 소개서",
      "연간 보고서",
      "논문집/학술지",
      "매뉴얼/가이드북",
      "포트폴리오 북",
      "졸업앨범",
    ],
    sort_order: 1,
  },
  {
    slug: "saddle-stitch",
    title: "중철제본",
    title_en: "Saddle Stitch",
    description:
      "당일 출고부터 익일 배송까지. 얇은 책자나 팸플릿에 최적화된 제본 방식입니다.",
    detail_description:
      "중철제본은 접힌 종이를 가운데에서 철심으로 고정하는 방식입니다. 페이지 수가 적은 책자, 팸플릿, 리플렛 등에 적합하며, 빠른 제작이 가능합니다. 당일 출고 서비스도 제공하여 급한 일정에도 대응 가능합니다.",
    image: "/images/services/saddle-stitch.jpg",
    tasks: [
      "팸플릿/리플렛",
      "회사 소개 브로슈어",
      "행사 프로그램북",
      "메뉴판",
      "뉴스레터",
      "소책자",
      "안내 책자",
      "교육 자료",
    ],
    sort_order: 2,
  },
  {
    slug: "spring-binding",
    title: "스프링제본",
    title_en: "Wire Binding",
    description:
      "최신 장비와 숙련된 기술진. 180도 펼침이 가능한 실용적인 제본입니다.",
    detail_description:
      "스프링제본(와이어제본)은 금속 또는 플라스틱 스프링으로 제본하는 방식입니다. 180도 완전히 펼쳐지고 360도 접을 수도 있어 노트, 달력, 요리책 등 실용적인 용도에 적합합니다. 다양한 색상의 스프링을 선택할 수 있습니다.",
    image: "/images/services/spring-binding.jpg",
    tasks: [
      "노트/다이어리",
      "달력/캘린더",
      "요리책/레시피북",
      "교재/워크북",
      "프레젠테이션 자료",
      "회의 자료",
      "매뉴얼",
      "스케치북",
    ],
    sort_order: 3,
  },
  {
    slug: "finishing",
    title: "후가공",
    title_en: "Finishing",
    description:
      "전문 상담을 통한 최적의 솔루션. 코팅, 오시, 접지, 박 등 다양한 후가공을 제공합니다.",
    detail_description:
      "인쇄물의 완성도를 높이는 다양한 후가공 서비스를 제공합니다. 무광/유광 코팅, 오시(접는선), 접지, 금박/은박, 형압, 타공 등 용도와 디자인에 맞는 최적의 후가공을 추천해 드립니다. 전문 상담을 통해 예산과 목적에 맞는 솔루션을 제안합니다.",
    image: "/images/services/finishing.jpg",
    tasks: [
      "무광 코팅 (매트)",
      "유광 코팅 (글로시)",
      "오시 (접는선)",
      "접지 (2단, 3단, 대문접기 등)",
      "금박/은박",
      "형압 (엠보싱)",
      "타공",
      "귀도리 (모서리 라운딩)",
    ],
    sort_order: 4,
  },
];

// Works 데이터
const worksData = [
  {
    title: "용지 선택 가이드",
    subtitle: "인쇄물에 맞는 용지 선택법",
    category: "guide",
    image: "/images/works/paper-guide.jpg",
    description:
      "스노우지, 모조지, 아트지... 어떤 용지가 맞을까요? 용도별 추천 용지를 알려드립니다.",
    content: `## 용지 선택의 중요성

인쇄물의 품질과 느낌은 용지 선택에 따라 크게 달라집니다. 책자, 카탈로그, 브로슈어 등 용도에 따라 적합한 용지가 다르며, 두께(평량)도 중요한 선택 요소입니다.

## 주요 용지 종류

### 스노우지
백색도가 높고 표면이 매끄러워 고급스러운 느낌을 줍니다. 카탈로그, 브로슈어, 회사 소개서에 추천합니다.

### 모조지
자연스러운 질감으로 책자, 교재, 논문집에 많이 사용됩니다. 장시간 읽어도 눈이 편합니다.

### 아트지
코팅 처리되어 색상이 선명하게 인쇄됩니다. 사진이 많은 인쇄물에 적합합니다.

### 미색모조지
아이보리 톤으로 눈의 피로를 줄여줍니다. 소설, 에세이 등 텍스트 중심 책자에 추천합니다.`,
    sort_order: 1,
  },
  {
    title: "후가공 가이드",
    subtitle: "인쇄물 완성도를 높이는 방법",
    category: "guide",
    image: "/images/works/finishing-guide.jpg",
    description:
      "코팅, 박, 형압 등 다양한 후가공으로 인쇄물의 품질을 한 단계 높여보세요.",
    content: `## 후가공이란?

후가공은 인쇄 후 추가 작업을 통해 인쇄물의 완성도와 내구성을 높이는 과정입니다.

## 주요 후가공 종류

### 코팅
- **무광 코팅**: 차분하고 고급스러운 느낌
- **유광 코팅**: 선명하고 생동감 있는 느낌

### 박 가공
- **금박**: 고급스럽고 화려한 느낌
- **은박**: 세련되고 모던한 느낌

### 형압 (엠보싱)
입체적인 질감을 더해 시각적, 촉각적 효과를 줍니다.

### 오시/접지
접는 선을 넣어 깔끔하게 접을 수 있도록 합니다.`,
    sort_order: 2,
  },
  {
    title: "인쇄 장비 소개",
    subtitle: "최신 장비로 최고의 품질을",
    category: "info",
    image: "/images/works/equipment.jpg",
    description: "성진인쇄의 최신 인쇄 장비와 제본 설비를 소개합니다.",
    content: `## 최신 인쇄 장비

성진인쇄는 최신 디지털 인쇄기와 오프셋 인쇄기를 보유하고 있습니다.

## 디지털 인쇄
- 소량 인쇄에 적합
- 빠른 출력 속도
- 다양한 용지 대응

## 오프셋 인쇄
- 대량 인쇄에 경제적
- 뛰어난 색상 재현력
- 안정적인 품질

## 제본 설비
- 무선제본기
- 중철제본기
- 스프링제본기`,
    sort_order: 3,
  },
  {
    title: "포트폴리오",
    subtitle: "성진인쇄 작업 사례",
    category: "portfolio",
    image: "/images/works/portfolio.jpg",
    description: "다양한 고객사의 인쇄물 제작 사례를 확인해보세요.",
    content: `## 작업 사례

성진인쇄에서 제작한 다양한 인쇄물 사례입니다.

### 기업 카탈로그
- A사 제품 카탈로그 (무선제본, 스노우지)
- B사 회사 소개서 (중철제본, 아트지)

### 학술 자료
- C대학교 논문집 (무선제본, 모조지)
- D연구소 보고서 (스프링제본)

### 홍보물
- E기업 브로슈어 (중철제본, 금박)
- F행사 프로그램북 (중철제본)`,
    sort_order: 4,
  },
];

// Site Settings 데이터
const siteSettingsData = [
  {
    key: "service_intro",
    value:
      "Sungjinprint는 무선제본, 중철제본, 스프링제본 등 다양한 제본 서비스를 제공합니다. 50부 이상 대량 주문 시 단가가 낮아지며, 최신 장비로 깔끔한 인쇄 품질을 보장합니다. 책자, 카탈로그, 브로슈어, 보고서 등 다양한 인쇄물을 제작해 드립니다. 용지 선택부터 후가공까지 전문 상담을 통해 최적의 솔루션을 제안합니다. 빠른 납기와 합리적인 가격으로 고객 만족을 위해 최선을 다하겠습니다.",
    description: "서비스 페이지 상단 소개 텍스트",
  },
];

async function migrate() {
  console.log("Starting migration...");

  // FAQ 마이그레이션
  console.log("Migrating FAQ...");
  const { error: faqError } = await supabase.from("faq").insert(faqData);
  if (faqError) {
    console.error("FAQ migration error:", faqError);
  } else {
    console.log("FAQ migrated successfully!");
  }

  // Services 마이그레이션
  console.log("Migrating Services...");
  const { error: servicesError } = await supabase
    .from("services")
    .insert(servicesData);
  if (servicesError) {
    console.error("Services migration error:", servicesError);
  } else {
    console.log("Services migrated successfully!");
  }

  // Works 마이그레이션
  console.log("Migrating Works...");
  const { error: worksError } = await supabase.from("works").insert(worksData);
  if (worksError) {
    console.error("Works migration error:", worksError);
  } else {
    console.log("Works migrated successfully!");
  }

  // Site Settings 마이그레이션
  console.log("Migrating Site Settings...");
  const { error: settingsError } = await supabase
    .from("site_settings")
    .insert(siteSettingsData);
  if (settingsError) {
    console.error("Site Settings migration error:", settingsError);
  } else {
    console.log("Site Settings migrated successfully!");
  }

  console.log("Migration complete!");
}

migrate();
