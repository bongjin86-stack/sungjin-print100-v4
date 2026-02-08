import type { CSSProperties } from "react";

/**
 * Admin 폼 공통 스타일
 * 모든 Admin 폼에서 일관된 UI를 위해 사용
 */
export const adminFormStyles: Record<string, CSSProperties> = {
  // 폼 컨테이너
  form: {
    background: "white",
    borderRadius: "0.5rem",
    padding: "2rem",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },

  // 폼 그리드
  formGrid: {
    display: "grid",
    gap: "1.5rem",
    marginBottom: "2rem",
  },

  // 폼 행 (2열 그리드)
  formRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
  },

  // 폼 그룹
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },

  // 라벨
  label: {
    fontWeight: 600,
    fontSize: "0.875rem",
    color: "#374151",
  },

  // 라벨 with required badge
  labelRequired: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontWeight: 600,
    fontSize: "0.875rem",
    color: "#374151",
  },

  // Required 뱃지
  requiredBadge: {
    background: "#222828",
    color: "#fff",
    fontSize: "0.6875rem",
    padding: "2px 8px",
    borderRadius: "4px",
  },

  // 힌트 텍스트
  hint: {
    fontSize: "0.75rem",
    color: "#6b7280",
    marginTop: "0.25rem",
  },

  // 입력 필드
  input: {
    padding: "0.75rem 1rem",
    border: "1px solid #e5e7eb",
    borderRadius: "0.375rem",
    fontSize: "1rem",
    outline: "none",
    transition: "border-color 0.2s",
  },

  // 텍스트영역
  textarea: {
    padding: "0.75rem 1rem",
    border: "1px solid #e5e7eb",
    borderRadius: "0.375rem",
    fontSize: "1rem",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.6,
  },

  // 셀렉트
  select: {
    padding: "0.75rem 1rem",
    border: "1px solid #e5e7eb",
    borderRadius: "0.375rem",
    fontSize: "1rem",
    outline: "none",
    background: "white",
  },

  // 에디터 섹션
  editorSection: {
    marginBottom: "2rem",
  },

  // 폼 액션 (버튼 영역)
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "1rem",
    paddingTop: "1rem",
    borderTop: "1px solid #e5e7eb",
  },

  // 취소 버튼
  cancelButton: {
    padding: "0.75rem 1.5rem",
    background: "#e5e7eb",
    color: "#374151",
    border: "none",
    borderRadius: "0.375rem",
    fontSize: "1rem",
    fontWeight: 500,
    cursor: "pointer",
    textDecoration: "none",
  },

  // 제출 버튼
  submitButton: {
    padding: "0.75rem 1.5rem",
    background: "#000",
    color: "white",
    border: "none",
    borderRadius: "0.375rem",
    fontSize: "1rem",
    fontWeight: 500,
    cursor: "pointer",
  },

  // 메시지 (성공)
  messageSuccess: {
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    marginBottom: "1.5rem",
    fontSize: "0.875rem",
    background: "#d1fae5",
    color: "#065f46",
    border: "1px solid #a7f3d0",
  },

  // 메시지 (에러)
  messageError: {
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    marginBottom: "1.5rem",
    fontSize: "0.875rem",
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
  },

  // 리스트 에디터 컨테이너
  listEditor: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    padding: "1rem",
    background: "#f9fafb",
    borderRadius: "0.5rem",
    border: "1px solid #e5e7eb",
  },

  // 리스트 아이템
  listItem: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
  },

  // 리스트 입력 필드
  listInput: {
    flex: 1,
    padding: "0.5rem 0.75rem",
    border: "1px solid #e5e7eb",
    borderRadius: "0.375rem",
    fontSize: "0.875rem",
    outline: "none",
  },

  // 항목 추가 버튼
  addButton: {
    padding: "0.5rem 1rem",
    background: "white",
    color: "#374151",
    border: "1px dashed #d1d5db",
    borderRadius: "0.375rem",
    fontSize: "0.875rem",
    cursor: "pointer",
    transition: "background 0.2s",
  },

  // 삭제 버튼
  removeButton: {
    padding: "0.5rem 0.75rem",
    background: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fecaca",
    borderRadius: "0.375rem",
    fontSize: "0.75rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  // 태그 아이템
  tagItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    background: "#f3f4f6",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.375rem",
    fontSize: "0.875rem",
  },

  // 태그 삭제 버튼
  tagRemoveButton: {
    background: "none",
    border: "none",
    color: "#991b1b",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: "bold",
    padding: 0,
  },
};

// 스타일 조합 헬퍼
export function mergeStyles(
  ...styles: (CSSProperties | undefined)[]
): CSSProperties {
  return Object.assign({}, ...styles.filter(Boolean));
}
