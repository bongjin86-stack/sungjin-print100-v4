import { useEffect, useState } from "react";

import { adminFormStyles as styles } from "./adminFormStyles";
import BlockNoteEditor, { renderBlocksToHTML } from "./BlockNoteEditor";

interface Cover {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  thumbnails?: (string | null)[];
  tag?: string;
  sort_order: number;
  is_published: boolean;
  section_id?: string;
  linked_product_id?: string;
  design_fee?: number;
}

interface Section {
  id: string;
  title: string;
  type: "text" | "blog" | "gallery";
  content: string;
  sort_order: number;
  is_published: boolean;
  covers: Cover[];
}

const TYPE_LABELS: Record<string, string> = {
  text: "텍스트",
  blog: "4열 (블로그)",
  gallery: "6열 (갤러리)",
};

const TYPE_BADGES: Record<string, { bg: string; color: string }> = {
  text: { bg: "#dbeafe", color: "#1e40af" },
  blog: { bg: "#fef3c7", color: "#92400e" },
  gallery: { bg: "#d1fae5", color: "#065f46" },
};

export default function Edu100SectionManager() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [addingCoverTo, setAddingCoverTo] = useState<string | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);

  // 데이터 로드
  const loadSections = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/edu100/sections");
      const data = await res.json();
      setSections(Array.isArray(data) ? data : []);
    } catch {
      console.error("섹션 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  // 섹션 추가
  const handleAddSection = async (type: string) => {
    const maxOrder = sections.reduce((max, s) => Math.max(max, s.sort_order), -1);
    const res = await fetch("/api/edu100/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: type === "text" ? "" : `새 ${TYPE_LABELS[type]} 섹션`,
        type,
        content: "",
        sort_order: maxOrder + 1,
        is_published: true,
      }),
    });
    if (res.ok) {
      setShowAddSection(false);
      loadSections();
    }
  };

  // 섹션 삭제
  const handleDeleteSection = async (id: string) => {
    if (!confirm("이 섹션을 삭제하시겠습니까? 소속 커버는 미분류로 이동합니다.")) return;
    const res = await fetch(`/api/edu100/sections/${id}`, { method: "DELETE" });
    if (res.ok) loadSections();
  };

  // 섹션 저장
  const handleSaveSection = async (section: Section) => {
    const res = await fetch(`/api/edu100/sections/${section.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: section.title,
        type: section.type,
        content: section.content,
        sort_order: section.sort_order,
        is_published: section.is_published,
      }),
    });
    if (res.ok) {
      setEditingSection(null);
      loadSections();
    }
  };

  // 섹션 순서 변경
  const handleMoveSection = async (index: number, direction: -1 | 1) => {
    const newSections = [...sections];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    // sort_order 교환
    const tempOrder = newSections[index].sort_order;
    newSections[index].sort_order = newSections[targetIndex].sort_order;
    newSections[targetIndex].sort_order = tempOrder;

    // 두 섹션 모두 저장
    await Promise.all([
      fetch(`/api/edu100/sections/${newSections[index].id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSections[index]),
      }),
      fetch(`/api/edu100/sections/${newSections[targetIndex].id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSections[targetIndex]),
      }),
    ]);
    loadSections();
  };

  // 커버 삭제
  const handleDeleteCover = async (coverId: string) => {
    if (!confirm("이 커버를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/edu100/${coverId}`, { method: "DELETE" });
    if (res.ok) loadSections();
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>로딩 중...</div>;
  }

  return (
    <div>
      {/* 상단 액션 */}
      <div style={{ marginBottom: "1.5rem" }}>
        {!showAddSection ? (
          <button
            onClick={() => setShowAddSection(true)}
            style={{
              ...styles.submitButton,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            + 줄 추가
          </button>
        ) : (
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
              padding: "1rem",
              background: "white",
              borderRadius: "0.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>
              타입 선택:
            </span>
            {(["text", "blog", "gallery"] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleAddSection(type)}
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.375rem",
                  background: TYPE_BADGES[type].bg,
                  color: TYPE_BADGES[type].color,
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {TYPE_LABELS[type]}
              </button>
            ))}
            <button
              onClick={() => setShowAddSection(false)}
              style={{
                padding: "0.5rem 0.75rem",
                border: "none",
                background: "none",
                color: "#9ca3af",
                cursor: "pointer",
              }}
            >
              취소
            </button>
          </div>
        )}
      </div>

      {/* 섹션 목록 */}
      {sections.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: "white",
            borderRadius: "0.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <p style={{ color: "#9ca3af", marginBottom: "1rem" }}>등록된 섹션이 없습니다.</p>
          <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
            "줄 추가" 버튼으로 첫 섹션을 만들어보세요.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {sections.map((section, idx) => (
            <SectionCard
              key={section.id}
              section={section}
              index={idx}
              totalSections={sections.length}
              isEditing={editingSection?.id === section.id}
              editingData={editingSection?.id === section.id ? editingSection : null}
              addingCover={addingCoverTo === section.id}
              onEdit={() => setEditingSection({ ...section })}
              onCancelEdit={() => setEditingSection(null)}
              onSave={handleSaveSection}
              onDelete={() => handleDeleteSection(section.id)}
              onMove={(dir) => handleMoveSection(idx, dir)}
              onEditingChange={(data) => setEditingSection(data)}
              onDeleteCover={handleDeleteCover}
              onAddCover={() => setAddingCoverTo(section.id)}
              onCancelAddCover={() => setAddingCoverTo(null)}
              onCoverAdded={() => {
                setAddingCoverTo(null);
                loadSections();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 섹션 카드 컴포넌트 ───

interface SectionCardProps {
  section: Section;
  index: number;
  totalSections: number;
  isEditing: boolean;
  editingData: Section | null;
  addingCover: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (section: Section) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onEditingChange: (data: Section) => void;
  onDeleteCover: (coverId: string) => void;
  onAddCover: () => void;
  onCancelAddCover: () => void;
  onCoverAdded: () => void;
}

function SectionCard({
  section,
  index,
  totalSections,
  isEditing,
  editingData,
  addingCover,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onMove,
  onEditingChange,
  onDeleteCover,
  onAddCover,
  onCancelAddCover,
  onCoverAdded,
}: SectionCardProps) {
  const badge = TYPE_BADGES[section.type];

  return (
    <div
      style={{
        background: "white",
        borderRadius: "0.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        overflow: "hidden",
      }}
    >
      {/* 섹션 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.5rem",
          borderBottom: "1px solid #f3f4f6",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* 순서 버튼 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <button
              onClick={() => onMove(-1)}
              disabled={index === 0}
              style={{
                border: "none",
                background: "none",
                cursor: index === 0 ? "default" : "pointer",
                opacity: index === 0 ? 0.3 : 1,
                fontSize: "0.75rem",
                padding: "0 4px",
                lineHeight: 1,
              }}
            >
              ▲
            </button>
            <button
              onClick={() => onMove(1)}
              disabled={index === totalSections - 1}
              style={{
                border: "none",
                background: "none",
                cursor: index === totalSections - 1 ? "default" : "pointer",
                opacity: index === totalSections - 1 ? 0.3 : 1,
                fontSize: "0.75rem",
                padding: "0 4px",
                lineHeight: 1,
              }}
            >
              ▼
            </button>
          </div>

          {/* 타입 뱃지 */}
          <span
            style={{
              display: "inline-block",
              padding: "0.25rem 0.5rem",
              borderRadius: "0.25rem",
              fontSize: "0.75rem",
              fontWeight: 500,
              background: badge.bg,
              color: badge.color,
            }}
          >
            {TYPE_LABELS[section.type]}
          </span>

          {/* 제목 */}
          <span style={{ fontWeight: 600, fontSize: "0.9375rem", color: "#111827" }}>
            {section.title || (section.type === "text" ? "(텍스트 섹션)" : "(제목 없음)")}
          </span>

          {/* 공개/비공개 */}
          <span
            style={{
              fontSize: "0.75rem",
              padding: "0.125rem 0.5rem",
              borderRadius: "9999px",
              background: section.is_published ? "#d1fae5" : "#fee2e2",
              color: section.is_published ? "#065f46" : "#991b1b",
            }}
          >
            {section.is_published ? "공개" : "비공개"}
          </span>

          {/* 커버 수 (text 아닌 경우) */}
          {section.type !== "text" && (
            <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
              {section.covers.length}개
            </span>
          )}
        </div>

        {/* 액션 버튼 */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={onEdit}
            style={{
              padding: "0.375rem 0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "0.25rem",
              background: "white",
              fontSize: "0.8125rem",
              cursor: "pointer",
              color: "#374151",
            }}
          >
            편집
          </button>
          <button
            onClick={onDelete}
            style={{
              padding: "0.375rem 0.75rem",
              border: "1px solid #fecaca",
              borderRadius: "0.25rem",
              background: "#fef2f2",
              fontSize: "0.8125rem",
              cursor: "pointer",
              color: "#991b1b",
            }}
          >
            삭제
          </button>
        </div>
      </div>

      {/* 편집 모드 */}
      {isEditing && editingData && (
        <div style={{ padding: "1.5rem", borderBottom: "1px solid #f3f4f6", background: "#fafafa" }}>
          <div style={{ display: "grid", gap: "1rem" }}>
            {editingData.type !== "text" && (
              <div style={styles.formGroup}>
                <label style={styles.label}>섹션 제목</label>
                <input
                  type="text"
                  value={editingData.title}
                  onChange={(e) => onEditingChange({ ...editingData, title: e.target.value })}
                  placeholder="예: News, Counterprint Books"
                  style={styles.input}
                />
              </div>
            )}

            {editingData.type === "text" && (
              <div style={styles.formGroup}>
                <label style={styles.label}>텍스트 내용</label>
                <BlockNoteEditor
                  initialContent={editingData.content}
                  onChange={(content) => onEditingChange({ ...editingData, content })}
                  height="200px"
                  placeholder="소개 텍스트를 입력하세요..."
                />
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>공개 여부</label>
                <select
                  value={editingData.is_published ? "true" : "false"}
                  onChange={(e) =>
                    onEditingChange({
                      ...editingData,
                      is_published: e.target.value === "true",
                    })
                  }
                  style={{ ...styles.select, width: "auto" }}
                >
                  <option value="true">공개</option>
                  <option value="false">비공개</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={onCancelEdit} style={styles.cancelButton}>
                취소
              </button>
              <button onClick={() => onSave(editingData)} style={styles.submitButton}>
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 텍스트 섹션 미리보기 */}
      {section.type === "text" && !isEditing && section.content && (
        <div
          style={{
            padding: "1rem 1.5rem",
            color: "#6b7280",
            fontSize: "0.875rem",
            borderBottom: "1px solid #f3f4f6",
          }}
          dangerouslySetInnerHTML={{ __html: renderBlocksToHTML(section.content).substring(0, 500) }}
        />
      )}

      {/* 블로그 섹션 안내 (커버 관리 불필요 — 블로그 글 자동 표시) */}
      {section.type === "blog" && (
        <div style={{ padding: "1rem 1.5rem" }}>
          <p style={{ fontSize: "0.8125rem", color: "#9ca3af" }}>
            이 섹션은 공개된 블로그 글을 자동으로 표시합니다.
            <a
              href="/admin/blog"
              style={{ color: "#4f46e5", marginLeft: "0.5rem", textDecoration: "underline" }}
            >
              블로그 관리 →
            </a>
          </p>
        </div>
      )}

      {/* 커버 목록 (gallery만) */}
      {section.type === "gallery" && (
        <div style={{ padding: "1rem 1.5rem" }}>
          {section.covers.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              {section.covers.map((cover) => (
                <div key={cover.id} style={{ position: "relative" }}>
                  <div
                    style={{
                      aspectRatio: "1/1",
                      background: "#f3f4f6",
                      borderRadius: "0.375rem",
                      overflow: "hidden",
                    }}
                  >
                    {cover.image ? (
                      <img
                        src={cover.image}
                        alt={cover.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#9ca3af",
                          fontSize: "0.75rem",
                        }}
                      >
                        No Image
                      </div>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "#374151",
                      marginTop: "0.375rem",
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cover.title}
                  </p>
                  {/* 삭제/편집 오버레이 */}
                  <div
                    style={{
                      position: "absolute",
                      top: "0.25rem",
                      right: "0.25rem",
                      display: "flex",
                      gap: "0.25rem",
                    }}
                  >
                    <a
                      href={`/admin/edu100/${cover.id}`}
                      style={{
                        width: "1.25rem",
                        height: "1.25rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        background: "rgba(0,0,0,0.5)",
                        color: "white",
                        fontSize: "0.625rem",
                        textDecoration: "none",
                      }}
                      title="편집"
                    >
                      ✎
                    </a>
                    <button
                      onClick={() => onDeleteCover(cover.id)}
                      style={{
                        width: "1.25rem",
                        height: "1.25rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        background: "rgba(220,38,38,0.7)",
                        color: "white",
                        fontSize: "0.625rem",
                        border: "none",
                        cursor: "pointer",
                      }}
                      title="삭제"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "0.8125rem", color: "#9ca3af", marginBottom: "0.75rem" }}>
              등록된 커버가 없습니다.
            </p>
          )}

          {/* 커버 추가 */}
          {!addingCover ? (
            <button
              onClick={onAddCover}
              style={{
                padding: "0.375rem 0.75rem",
                border: "1px dashed #d1d5db",
                borderRadius: "0.375rem",
                background: "white",
                color: "#6b7280",
                fontSize: "0.8125rem",
                cursor: "pointer",
              }}
            >
              + 커버 추가
            </button>
          ) : (
            <QuickCoverForm
              sectionId={section.id}
              currentCoverIds={section.covers.map((c) => c.id)}
              onCancel={onCancelAddCover}
              onSaved={onCoverAdded}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── 기존 커버 선택 + 섹션 배정 ───

interface QuickCoverFormProps {
  sectionId: string;
  currentCoverIds: string[];
  onCancel: () => void;
  onSaved: () => void;
}

function QuickCoverForm({ sectionId, currentCoverIds, onCancel, onSaved }: QuickCoverFormProps) {
  const [allCovers, setAllCovers] = useState<Cover[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<"unassigned" | "all">("unassigned");

  useEffect(() => {
    fetch("/api/edu100")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAllCovers(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = allCovers.filter((c) => {
    if (currentCoverIds.includes(c.id)) return false;
    if (filter === "unassigned") return !c.section_id;
    return true;
  });

  const handleAssign = async (coverId: string) => {
    setSaving(coverId);
    try {
      const cover = allCovers.find((c) => c.id === coverId);
      if (!cover) return;
      const res = await fetch(`/api/edu100/${coverId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cover, section_id: sectionId }),
      });
      if (res.ok) {
        onSaved();
      } else {
        alert("배정 실패");
      }
    } catch {
      alert("배정 실패");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div
      style={{
        padding: "1rem",
        border: "1px solid #e5e7eb",
        borderRadius: "0.5rem",
        background: "#fafafa",
      }}
    >
      {/* 헤더 + 필터 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>
          표지 선택
        </span>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            onClick={() => setFilter("unassigned")}
            style={{
              padding: "0.25rem 0.625rem",
              border: "1px solid #e5e7eb",
              borderRadius: "0.25rem",
              background: filter === "unassigned" ? "#111827" : "white",
              color: filter === "unassigned" ? "white" : "#6b7280",
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
          >
            미배정
          </button>
          <button
            onClick={() => setFilter("all")}
            style={{
              padding: "0.25rem 0.625rem",
              border: "1px solid #e5e7eb",
              borderRadius: "0.25rem",
              background: filter === "all" ? "#111827" : "white",
              color: filter === "all" ? "white" : "#6b7280",
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
          >
            전체
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: "0.25rem 0.5rem",
              border: "none",
              background: "none",
              color: "#9ca3af",
              fontSize: "0.8125rem",
              cursor: "pointer",
            }}
          >
            닫기
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: "0.8125rem", color: "#9ca3af", textAlign: "center", padding: "1rem" }}>
          로딩 중...
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ fontSize: "0.8125rem", color: "#9ca3af", textAlign: "center", padding: "1rem" }}>
          {filter === "unassigned" ? "미배정 표지가 없습니다." : "추가할 표지가 없습니다."}
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
            gap: "0.5rem",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {filtered.map((cover) => (
            <button
              key={cover.id}
              onClick={() => handleAssign(cover.id)}
              disabled={saving === cover.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "0.375rem",
                background: "white",
                padding: 0,
                cursor: saving === cover.id ? "wait" : "pointer",
                opacity: saving === cover.id ? 0.5 : 1,
                textAlign: "left",
                overflow: "hidden",
              }}
              title={cover.title}
            >
              <div style={{ aspectRatio: "1/1", background: "#f3f4f6", overflow: "hidden" }}>
                {cover.image ? (
                  <img
                    src={cover.image}
                    alt={cover.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#d1d5db",
                      fontSize: "0.625rem",
                    }}
                  >
                    No Image
                  </div>
                )}
              </div>
              <div style={{ padding: "0.375rem" }}>
                <p
                  style={{
                    fontSize: "0.6875rem",
                    color: "#374151",
                    fontWeight: 500,
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    margin: 0,
                  }}
                >
                  {cover.title}
                </p>
                {cover.tag && (
                  <p style={{ fontSize: "0.625rem", color: "#6b7280", margin: "2px 0 0" }}>
                    {cover.tag}
                  </p>
                )}
                {(cover.design_fee ?? 0) > 0 && (
                  <p style={{ fontSize: "0.625rem", color: "#92400e", margin: "2px 0 0" }}>
                    디자인비 {(cover.design_fee ?? 0).toLocaleString()}원
                  </p>
                )}
                {cover.section_id && (
                  <p style={{ fontSize: "0.5625rem", color: "#9ca3af", margin: "2px 0 0" }}>
                    다른 섹션 배정됨
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
