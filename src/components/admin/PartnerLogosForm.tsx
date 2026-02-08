import React, { useEffect, useRef, useState } from "react";

import { supabase, uploadImage } from "@/lib/supabase";

interface PartnerLogo {
  id: string;
  name: string;
  logo_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export default function PartnerLogosForm() {
  const [logos, setLogos] = useState<PartnerLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    fetchLogos();
  }, []);

  const fetchLogos = async () => {
    try {
      const { data, error } = await supabase
        .from("partner_logos")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setLogos(data || []);
    } catch (err: any) {
      console.error("Error fetching logos:", err);
      setMessage({ type: "error", text: "로고를 불러오는데 실패했습니다." });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (logoId: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "이미지 파일만 업로드 가능합니다." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "파일 크기는 5MB 이하여야 합니다." });
      return;
    }

    setUploadingId(logoId);
    setMessage(null);

    try {
      const publicUrl = await uploadImage(file, "partners");

      // Update database
      const { error: updateError } = await supabase
        .from("partner_logos")
        .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", logoId);

      if (updateError) throw updateError;

      // Update local state
      setLogos(
        logos.map((logo) =>
          logo.id === logoId ? { ...logo, logo_url: publicUrl } : logo
        )
      );

      setMessage({ type: "success", text: "로고가 업데이트되었습니다!" });
    } catch (err: any) {
      console.error("Upload error:", err);
      setMessage({ type: "error", text: "업로드에 실패했습니다." });
    } finally {
      setUploadingId(null);
    }
  };

  const handleUpdateLogo = async (logo: PartnerLogo) => {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("partner_logos")
        .update({
          name: logo.name,
          link_url: logo.link_url,
          is_active: logo.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", logo.id);

      if (error) throw error;

      setEditingId(null);
      setMessage({ type: "success", text: "저장되었습니다!" });
    } catch (err: any) {
      console.error("Error updating logo:", err);
      setMessage({ type: "error", text: "저장에 실패했습니다." });
    } finally {
      setSaving(false);
    }
  };

  const handleAddLogo = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const newOrder =
        logos.length > 0 ? Math.max(...logos.map((l) => l.sort_order)) + 1 : 1;

      const { data, error } = await supabase
        .from("partner_logos")
        .insert([
          {
            name: "새 파트너",
            logo_url: "",
            link_url: "",
            sort_order: newOrder,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setLogos([...logos, data]);
      setEditingId(data.id);
      setMessage({ type: "success", text: "새 로고가 추가되었습니다." });
    } catch (err: any) {
      console.error("Error adding logo:", err);
      setMessage({ type: "error", text: "추가에 실패했습니다." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLogo = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("partner_logos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setLogos(logos.filter((logo) => logo.id !== id));
      setMessage({ type: "success", text: "삭제되었습니다." });
    } catch (err: any) {
      console.error("Error deleting logo:", err);
      setMessage({ type: "error", text: "삭제에 실패했습니다." });
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newLogos = [...logos];
    const temp = newLogos[index].sort_order;
    newLogos[index].sort_order = newLogos[index - 1].sort_order;
    newLogos[index - 1].sort_order = temp;

    [newLogos[index], newLogos[index - 1]] = [
      newLogos[index - 1],
      newLogos[index],
    ];

    setLogos(newLogos);

    // Update database
    await Promise.all([
      supabase
        .from("partner_logos")
        .update({ sort_order: newLogos[index].sort_order })
        .eq("id", newLogos[index].id),
      supabase
        .from("partner_logos")
        .update({ sort_order: newLogos[index - 1].sort_order })
        .eq("id", newLogos[index - 1].id),
    ]);
  };

  const handleMoveDown = async (index: number) => {
    if (index === logos.length - 1) return;

    const newLogos = [...logos];
    const temp = newLogos[index].sort_order;
    newLogos[index].sort_order = newLogos[index + 1].sort_order;
    newLogos[index + 1].sort_order = temp;

    [newLogos[index], newLogos[index + 1]] = [
      newLogos[index + 1],
      newLogos[index],
    ];

    setLogos(newLogos);

    // Update database
    await Promise.all([
      supabase
        .from("partner_logos")
        .update({ sort_order: newLogos[index].sort_order })
        .eq("id", newLogos[index].id),
      supabase
        .from("partner_logos")
        .update({ sort_order: newLogos[index + 1].sort_order })
        .eq("id", newLogos[index + 1].id),
    ]);
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="partner-logos-form">
      <div className="header">
        <h2>파트너 로고 관리</h2>
        <button className="add-btn" onClick={handleAddLogo} disabled={saving}>
          + 새 로고 추가
        </button>
      </div>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <p className="description">
        로고 이미지를 클릭하여 새 이미지로 교체할 수 있습니다. 현재 슬라이더와
        동일한 위치, 동일한 속도로 표시됩니다.
      </p>

      <div className="logos-grid">
        {logos.map((logo, index) => (
          <div
            key={logo.id}
            className={`logo-card ${!logo.is_active ? "inactive" : ""}`}
          >
            <div className="logo-order">
              <button
                className="order-btn"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
              >
                ↑
              </button>
              <span>{index + 1}</span>
              <button
                className="order-btn"
                onClick={() => handleMoveDown(index)}
                disabled={index === logos.length - 1}
              >
                ↓
              </button>
            </div>

            <div
              className="logo-image-container"
              onClick={() => fileInputRefs.current[logo.id]?.click()}
            >
              {uploadingId === logo.id ? (
                <div className="uploading">업로드 중...</div>
              ) : logo.logo_url ? (
                <img
                  src={logo.logo_url}
                  alt={logo.name}
                  className="logo-image"
                />
              ) : (
                <div className="no-image">클릭하여 이미지 업로드</div>
              )}
              <input
                type="file"
                accept="image/*"
                ref={(el) => {
                  fileInputRefs.current[logo.id] = el;
                }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(logo.id, file);
                }}
                style={{ display: "none" }}
              />
              <div className="image-overlay">클릭하여 변경</div>
            </div>

            {editingId === logo.id ? (
              <div className="logo-edit-form">
                <input
                  type="text"
                  value={logo.name}
                  onChange={(e) =>
                    setLogos(
                      logos.map((l) =>
                        l.id === logo.id ? { ...l, name: e.target.value } : l
                      )
                    )
                  }
                  placeholder="파트너명"
                />
                <input
                  type="text"
                  value={logo.link_url || ""}
                  onChange={(e) =>
                    setLogos(
                      logos.map((l) =>
                        l.id === logo.id
                          ? { ...l, link_url: e.target.value }
                          : l
                      )
                    )
                  }
                  placeholder="링크 URL (선택사항)"
                />
                <label className="active-toggle">
                  <input
                    type="checkbox"
                    checked={logo.is_active}
                    onChange={(e) =>
                      setLogos(
                        logos.map((l) =>
                          l.id === logo.id
                            ? { ...l, is_active: e.target.checked }
                            : l
                        )
                      )
                    }
                  />
                  활성화
                </label>
                <div className="edit-actions">
                  <button
                    className="save-btn"
                    onClick={() => handleUpdateLogo(logo)}
                    disabled={saving}
                  >
                    저장
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setEditingId(null);
                      fetchLogos();
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="logo-info">
                <h3>{logo.name}</h3>
                {logo.link_url && (
                  <a
                    href={logo.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-preview"
                  >
                    {logo.link_url}
                  </a>
                )}
                <div className="card-actions">
                  <button
                    className="edit-btn"
                    onClick={() => setEditingId(logo.id)}
                  >
                    수정
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteLogo(logo.id)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .partner-logos-form {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .header h2 {
          font-size: 1.5rem;
          font-weight: 600;
        }

        .add-btn {
          padding: 0.75rem 1.5rem;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .add-btn:hover:not(:disabled) {
          background: #218838;
        }

        .add-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .description {
          color: #666;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
        }

        .message {
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .message.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .logos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .logo-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 0.75rem;
          overflow: hidden;
          transition: box-shadow 0.2s;
        }

        .logo-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .logo-card.inactive {
          opacity: 0.5;
        }

        .logo-order {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: #f8f9fa;
          border-bottom: 1px solid #e0e0e0;
        }

        .order-btn {
          width: 28px;
          height: 28px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .order-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .logo-image-container {
          position: relative;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
          cursor: pointer;
          overflow: hidden;
        }

        .logo-image {
          max-width: 80%;
          max-height: 80%;
          object-fit: contain;
        }

        .no-image {
          color: #999;
          font-size: 0.875rem;
        }

        .uploading {
          color: #007bff;
          font-size: 0.875rem;
        }

        .image-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.5);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
          font-size: 0.875rem;
        }

        .logo-image-container:hover .image-overlay {
          opacity: 1;
        }

        .logo-info, .logo-edit-form {
          padding: 1rem;
        }

        .logo-info h3 {
          font-size: 1rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }

        .link-preview {
          display: block;
          font-size: 0.75rem;
          color: #666;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          margin-bottom: 0.75rem;
        }

        .card-actions {
          display: flex;
          gap: 0.5rem;
        }

        .edit-btn, .delete-btn {
          flex: 1;
          padding: 0.5rem;
          border: none;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .edit-btn {
          background: #e9ecef;
          color: #333;
        }

        .edit-btn:hover {
          background: #dee2e6;
        }

        .delete-btn {
          background: #f8d7da;
          color: #721c24;
        }

        .delete-btn:hover {
          background: #f5c6cb;
        }

        .logo-edit-form input[type="text"] {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 0.25rem;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .active-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }

        .edit-actions {
          display: flex;
          gap: 0.5rem;
        }

        .save-btn, .cancel-btn {
          flex: 1;
          padding: 0.5rem;
          border: none;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          cursor: pointer;
        }

        .save-btn {
          background: #007bff;
          color: white;
        }

        .save-btn:hover:not(:disabled) {
          background: #0056b3;
        }

        .cancel-btn {
          background: #e9ecef;
          color: #333;
        }

        .cancel-btn:hover {
          background: #dee2e6;
        }

        .loading {
          text-align: center;
          padding: 2rem;
          color: #666;
        }
      `}</style>
    </div>
  );
}
