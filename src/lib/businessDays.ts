// 한국 공휴일 데이터 (하드코딩)
// 매년 초에 업데이트 필요

export const HOLIDAYS: string[] = [
  // 2025년
  '2025-01-01', // 신정
  '2025-01-28', // 설날 연휴
  '2025-01-29', // 설날
  '2025-01-30', // 설날 연휴
  '2025-03-01', // 삼일절
  '2025-05-05', // 어린이날
  '2025-05-06', // 대체공휴일
  '2025-06-06', // 현충일
  '2025-08-15', // 광복절
  '2025-10-03', // 개천절
  '2025-10-05', // 추석 연휴
  '2025-10-06', // 추석
  '2025-10-07', // 추석 연휴
  '2025-10-08', // 대체공휴일
  '2025-10-09', // 한글날
  '2025-12-25', // 성탄절

  // 2026년
  '2026-01-01', // 신정
  '2026-02-16', // 설날 연휴
  '2026-02-17', // 설날
  '2026-02-18', // 설날 연휴
  '2026-03-01', // 삼일절
  '2026-03-02', // 대체공휴일
  '2026-05-05', // 어린이날
  '2026-05-24', // 부처님오신날
  '2026-05-25', // 대체공휴일
  '2026-06-06', // 현충일
  '2026-08-15', // 광복절
  '2026-08-17', // 대체공휴일
  '2026-09-24', // 추석 연휴
  '2026-09-25', // 추석
  '2026-09-26', // 추석 연휴
  '2026-10-03', // 개천절
  '2026-10-05', // 대체공휴일
  '2026-10-09', // 한글날
  '2026-12-25', // 성탄절
];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isHoliday(date: Date): boolean {
  return HOLIDAYS.includes(formatDate(date));
}

export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date);
}

const CUTOFF_HOUR = 14;

export function getBusinessDate(businessDays: number): Date {
  const now = new Date();
  // 항상 새로운 Date 객체로 시작
  const date = new Date(now.getTime());

  const isPastCutoff = now.getHours() >= CUTOFF_HOUR;

  // 마감 시간 지났거나 영업일이 아니면 다음 영업일로
  if (isPastCutoff || !isBusinessDay(date)) {
    do {
      date.setDate(date.getDate() + 1);
    } while (!isBusinessDay(date));
  }

  // 당일 출고면 바로 반환
  if (businessDays === 0) {
    return new Date(date.getTime());
  }

  // N영업일 후 계산
  let count = 0;
  while (count < businessDays) {
    date.setDate(date.getDate() + 1);
    if (isBusinessDay(date)) {
      count++;
    }
  }

  return new Date(date.getTime());
}

export function formatBusinessDate(date: Date): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayName = days[date.getDay()];

  return `${month}/${day}(${dayName})`;
}
