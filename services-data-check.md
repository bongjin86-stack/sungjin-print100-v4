# Services 테이블 데이터 확인

## 무선제본 (wireless-binding)

- tasks: `["책자/단행본 제본","논문집/학술지","카탈로그/브로슈어",...]` - 7개 항목 있음
- image: `/images/services/web-development.jpg`

## 중철제본 (saddle-stitch)

- tasks: `["잡지/매거진","팸플릿/리플렛","프로그램 북",...]` - 6개 항목
- image: `/images/services/uiux-design.jpg`

## 스프링제본 (spring-binding)

- tasks: `["다이어리/플래너","노트/메모장","교재/워크북",...]` - 5개 항목
- image: `/images/services/mobile-apps.jpg`

## 양장제본 (hardcover)

- tasks: `["졸업앨범","기념 도서","사진집",...]` - 5개 항목
- image: `/images/services/digital-strategy.jpg` (방금 수정됨)

## 문제점

- 무선제본의 tasks 데이터가 DB에는 있는데 랜딩페이지에서 표시 안 됨
- ServiceDetail.astro 컴포넌트에서 tasks 배열 처리 확인 필요
