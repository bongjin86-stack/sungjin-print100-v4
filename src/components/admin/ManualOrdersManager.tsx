import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import { adminFormStyles as styles } from "./adminFormStyles";

interface ManualOrder {
  id: number;
  created_at: string;
  work_date: string;
  book_count: number;
  memo: string | null;
  is_published: boolean;
  sort_order: number;
}

const emptyForm = {
  work_date: new Date().toISOString().slice(0, 10),
  book_count: 0,
  memo: "",
  is_published: true,
};

export default function ManualOrdersManager() {
  const [orders, setOrders] = useState<ManualOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // 카운터 시작 날짜 설정
  const [startDate, setStartDate] = useState("");
  const [dateSaving, setDateSaving] = useState(false);


  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    if (type === "success") setTimeout(() => setMessage(null), 3000);
  };

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("manual_orders")
      .select("*")
      .order("work_date", { ascending: false });

    if (error) {
      showMsg("error", error.message);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const loadStartDate = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "edu100_stats_start_date")
      .maybeSingle();
    if (data?.value) setStartDate(data.value);
  };

  const saveStartDate = async () => {
    setDateSaving(true);
    // YYYY-MM-DD → YYYY.MM.DD 포맷으로 저장
    const formatted = startDate.replace(/-/g, ".");
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        { key: "edu100_stats_start_date", value: formatted },
        { onConflict: "key" }
      );
    if (error) {
      showMsg("error", error.message);
    } else {
      showMsg("success", "시작 날짜가 저장되었습니다.");
    }
    setDateSaving(false);
  };

  useEffect(() => {
    loadOrders();
    loadStartDate();
  }, []);

  const resetForm = () => {
    setFormData(emptyForm);
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (order: ManualOrder) => {
    setEditingId(order.id);
    setFormData({
      work_date: order.work_date,
      book_count: order.book_count,
      memo: order.memo || "",
      is_published: order.is_published,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.work_date || formData.book_count <= 0) {
      showMsg("error", "작업일과 권수를 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        work_date: formData.work_date,
        book_count: Number(formData.book_count),
        memo: formData.memo || null,
        is_published: formData.is_published,
      };

      if (editingId) {
        const { error } = await supabase
          .from("manual_orders")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        showMsg("success", "수정되었습니다.");
      } else {
        const { error } = await supabase
          .from("manual_orders")
          .insert([payload]);
        if (error) throw error;
        showMsg("success", "등록되었습니다.");
      }

      resetForm();
      loadOrders();
    } catch (err: any) {
      showMsg("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase
      .from("manual_orders")
      .delete()
      .eq("id", id);
    if (error) {
      showMsg("error", error.message);
    } else {
      showMsg("success", "삭제되었습니다.");
      loadOrders();
    }
  };

  return (
    <div>
      {message && (
        <div
          style={
            message.type === "success"
              ? styles.messageSuccess
              : styles.messageError
          }
        >
          {message.text}
        </div>
      )}

      {/* 카운터 시작 날짜 설정 */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          marginBottom: "1.5rem",
          padding: "1rem",
          background: "white",
          borderRadius: "0.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <label style={{ ...styles.label, whiteSpace: "nowrap" }}>
          카운터 시작일
        </label>
        <input
          type="date"
          value={startDate.replace(/\./g, "-")}
          onChange={(e) => setStartDate(e.target.value)}
          style={{ ...styles.input, flex: 1, maxWidth: "200px" }}
        />
        <span style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
          {startDate ? `${startDate.replace(/-/g, ".")} — 현재 (라이브)` : "미설정"}
        </span>
        <button
          type="button"
          onClick={saveStartDate}
          disabled={dateSaving}
          style={{ ...styles.submitButton, whiteSpace: "nowrap" }}
        >
          {dateSaving ? "저장중..." : "저장"}
        </button>
      </div>

      {/* 추가/수정 폼 */}
      {showForm ? (
        <form onSubmit={handleSubmit} style={styles.form}>
          <h3 style={{ marginBottom: "1rem", fontWeight: 600 }}>
            {editingId ? "실적 수정" : "실적 등록"}
          </h3>
          <div style={styles.formGrid}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>작업일 *</label>
                <input
                  type="date"
                  value={formData.work_date}
                  onChange={(e) =>
                    setFormData({ ...formData, work_date: e.target.value })
                  }
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>제작 권수 *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.book_count || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      book_count: parseInt(e.target.value) || 0,
                    })
                  }
                  style={styles.input}
                  placeholder="예: 350"
                  required
                />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>메모</label>
              <input
                type="text"
                value={formData.memo}
                onChange={(e) =>
                  setFormData({ ...formData, memo: e.target.value })
                }
                style={styles.input}
                placeholder="예: A학원 무선제본 350부"
              />
            </div>
            <div style={styles.formGroup}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) =>
                    setFormData({ ...formData, is_published: e.target.checked })
                  }
                />
                <span style={styles.label}>공개</span>
              </label>
            </div>
          </div>
          <div style={styles.formActions}>
            <button type="button" onClick={resetForm} style={styles.cancelButton}>
              취소
            </button>
            <button type="submit" disabled={saving} style={styles.submitButton}>
              {saving ? "저장 중..." : editingId ? "수정" : "등록"}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          style={{
            ...styles.submitButton,
            marginBottom: "1.5rem",
          }}
        >
          + 실적 등록
        </button>
      )}

      {/* 리스트 */}
      {loading ? (
        <p style={{ color: "#6b7280", padding: "2rem 0" }}>로딩 중...</p>
      ) : orders.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            background: "white",
            borderRadius: "0.5rem",
            color: "#6b7280",
          }}
        >
          등록된 실적이 없습니다.
        </div>
      ) : (
        <div
          style={{
            background: "white",
            borderRadius: "0.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f9fafb",
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  fontWeight: 600,
                }}
              >
                <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>
                  작업일
                </th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                  권수
                </th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>
                  메모
                </th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                  상태
                </th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: ManualOrder) => (
                <tr
                  key={order.id}
                  style={{ borderBottom: "1px solid #f3f4f6" }}
                >
                  <td style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                    {order.work_date}
                  </td>
                  <td
                    style={{
                      padding: "0.5rem 1rem",
                      textAlign: "right",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                    }}
                  >
                    {order.book_count.toLocaleString()}부
                  </td>
                  <td
                    style={{
                      padding: "0.5rem 1rem",
                      fontSize: "0.875rem",
                      color: "#6b7280",
                    }}
                  >
                    {order.memo || "-"}
                  </td>
                  <td
                    style={{
                      padding: "0.5rem 1rem",
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.125rem 0.5rem",
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        background: order.is_published ? "#d1fae5" : "#fee2e2",
                        color: order.is_published ? "#065f46" : "#991b1b",
                      }}
                    >
                      {order.is_published ? "공개" : "비공개"}
                    </span>
                  </td>
                  <td style={{ padding: "0.5rem 1rem", textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        justifyContent: "center",
                      }}
                    >
                      <button
                        onClick={() => handleEdit(order)}
                        style={{
                          padding: "0.375rem 0.75rem",
                          background: "#e5e7eb",
                          border: "none",
                          borderRadius: "0.25rem",
                          fontSize: "0.8125rem",
                          cursor: "pointer",
                        }}
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(order.id)}
                        style={{
                          padding: "0.375rem 0.75rem",
                          background: "#fee2e2",
                          color: "#991b1b",
                          border: "none",
                          borderRadius: "0.25rem",
                          fontSize: "0.8125rem",
                          cursor: "pointer",
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
