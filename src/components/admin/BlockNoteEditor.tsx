import { useEffect, useMemo, useRef, useState } from "react";

interface BlockNoteEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  height?: string;
  placeholder?: string;
}

// 마크다운을 BlockNote 블록으로 변환하는 함수
function markdownToBlocks(markdown: string): any[] {
  if (!markdown || markdown.trim() === "") {
    return [{ type: "paragraph", content: [] }];
  }

  const blocks: any[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push({
        type: "heading",
        props: { level: Math.min(level, 3) },
        content: [{ type: "text", text: headingMatch[2] }],
      });
      i++;
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      blocks.push({
        type: "bulletListItem",
        content: [{ type: "text", text: bulletMatch[1] }],
      });
      i++;
      continue;
    }

    const numberMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberMatch) {
      blocks.push({
        type: "numberedListItem",
        content: [{ type: "text", text: numberMatch[1] }],
      });
      i++;
      continue;
    }

    const quoteMatch = line.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      blocks.push({
        type: "paragraph",
        content: [{ type: "text", text: quoteMatch[1] || "" }],
      });
      i++;
      continue;
    }

    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
      i++;
      continue;
    }

    let text = line;
    text = text.replace(/\*\*(.+?)\*\*/g, "$1");
    text = text.replace(/\*(.+?)\*/g, "$1");

    blocks.push({
      type: "paragraph",
      content: [{ type: "text", text }],
    });
    i++;
  }

  return blocks.length > 0 ? blocks : [{ type: "paragraph", content: [] }];
}

const FONT_SIZES = [
  { label: "12", value: "12px" },
  { label: "13", value: "13px" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
];

// 실제 BlockNote 에디터 컴포넌트 (클라이언트에서만 로드)
function BlockNoteEditorInner({
  initialContent = "",
  onChange,
  height = "120px",
}: BlockNoteEditorProps) {
  const [editor, setEditor] = useState<any>(null);
  const [modules, setModules] = useState<any>(null);

  // 초기 블록 파싱
  const initialBlocks = useMemo(() => {
    if (!initialContent) return undefined;

    try {
      const parsed = JSON.parse(initialContent);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return markdownToBlocks(initialContent);
    }

    return undefined;
  }, [initialContent]);

  // Dynamic import of BlockNote
  useEffect(() => {
    let mounted = true;

    const loadBlockNote = async () => {
      try {
        const [coreModule, reactModule, mantineModule] = await Promise.all([
          import("@blocknote/core"),
          import("@blocknote/react"),
          import("@blocknote/mantine"),
        ]);

        // Import CSS
        await import("@blocknote/mantine/style.css");

        if (!mounted) return;

        // fontSize 커스텀 스타일
        const FontSize = reactModule.createReactStyleSpec(
          { type: "fontSize", propSchema: "string" },
          {
            render: (props: any) => {
              const ref = props.contentRef;
              return <span style={{ fontSize: props.value }} ref={ref} />;
            },
          }
        );

        const schema = coreModule.BlockNoteSchema.create({
          styleSpecs: {
            ...coreModule.defaultStyleSpecs,
            fontSize: FontSize,
          },
        });

        const newEditor = coreModule.BlockNoteEditor.create({
          schema,
          initialContent: initialBlocks,
          uploadFile: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });
            if (!res.ok) throw new Error("업로드 실패");
            const data = await res.json();
            return data.url;
          },
        });

        setEditor(newEditor);
        setModules({
          core: coreModule,
          react: reactModule,
          mantine: mantineModule,
        });
      } catch (error) {
        console.error("Failed to load BlockNote:", error);
      }
    };

    loadBlockNote();

    return () => {
      mounted = false;
    };
  }, []);

  // 변경 감지
  useEffect(() => {
    if (!editor || !onChange) return;

    const handleChange = () => {
      const blocks = editor.document;
      onChange(JSON.stringify(blocks));
    };

    editor.onEditorContentChange(handleChange);
  }, [editor, onChange]);

  if (!editor || !modules) {
    return (
      <div
        style={{
          minHeight: height,
          border: "1px solid #e5e7eb",
          borderRadius: "0.375rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
          color: "#6b7280",
        }}
      >
        에디터 로딩 중...
      </div>
    );
  }

  const { BlockNoteView } = modules.mantine;

  const {
    FormattingToolbarController,
    FormattingToolbar,
    BlockTypeSelect,
    BasicTextStyleButton,
    ColorStyleButton,
    CreateLinkButton,
    NestBlockButton,
    UnnestBlockButton,
    useBlockNoteEditor,
    useComponentsContext,
  } = modules.react;

  // 폰트 사이즈 드롭다운 버튼
  const FontSizeButton = () => {
    const ed = useBlockNoteEditor();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node))
          setOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    const currentSize = ed.getActiveStyles?.()?.fontSize || "";

    return (
      <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          style={{
            padding: "2px 6px",
            fontSize: "12px",
            fontWeight: 500,
            border: "none",
            background: open ? "#f3f4f6" : "transparent",
            borderRadius: "4px",
            cursor: "pointer",
            color: "#374151",
            display: "flex",
            alignItems: "center",
            gap: "2px",
          }}
          title="폰트 사이즈"
        >
          {currentSize ? currentSize.replace("px", "") : "크기"}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M3 4L5 6L7 4"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {open && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 999,
              minWidth: "60px",
              overflow: "hidden",
            }}
          >
            {FONT_SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  ed.addStyles({ fontSize: s.value });
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "4px 10px",
                  fontSize: "12px",
                  border: "none",
                  background:
                    currentSize === s.value ? "#f3f4f6" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "#374151",
                }}
              >
                {s.label}px
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                ed.removeStyles({ fontSize: "" });
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "4px 10px",
                fontSize: "11px",
                border: "none",
                borderTop: "1px solid #e5e7eb",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                color: "#9ca3af",
              }}
            >
              초기화
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: height,
        border: "1px solid #e5e7eb",
        borderRadius: "0.375rem",
        overflow: "hidden",
      }}
    >
      <BlockNoteView editor={editor} theme="light" formattingToolbar={false}>
        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar>
              <BlockTypeSelect />
              <BasicTextStyleButton basicTextStyle="bold" />
              <BasicTextStyleButton basicTextStyle="italic" />
              <BasicTextStyleButton basicTextStyle="underline" />
              <BasicTextStyleButton basicTextStyle="strike" />
              <FontSizeButton />
              <ColorStyleButton />
              <NestBlockButton />
              <UnnestBlockButton />
              <CreateLinkButton />
            </FormattingToolbar>
          )}
        />
      </BlockNoteView>
    </div>
  );
}

// 메인 컴포넌트 - SSR 체크
export default function BlockNoteEditorComponent(props: BlockNoteEditorProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div
        style={{
          minHeight: props.height || "120px",
          border: "1px solid #e5e7eb",
          borderRadius: "0.375rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
          color: "#6b7280",
        }}
      >
        에디터 로딩 중...
      </div>
    );
  }

  return <BlockNoteEditorInner {...props} />;
}

// JSON 블록을 HTML로 렌더링하는 유틸리티 함수 (프론트엔드용)
export function renderBlocksToHTML(content: string): string {
  if (!content) return "";

  let blocks: any[];

  try {
    blocks = JSON.parse(content);
    if (!Array.isArray(blocks)) {
      return markdownToHTML(content);
    }
  } catch {
    return markdownToHTML(content);
  }

  return blocks
    .map((block) => {
      const blockContent =
        block.content
          ?.map((c: any) => {
            let text = c.text || "";
            if (c.styles?.bold) text = `<strong>${text}</strong>`;
            if (c.styles?.italic) text = `<em>${text}</em>`;
            if (c.styles?.underline) text = `<u>${text}</u>`;
            if (c.styles?.strike) text = `<s>${text}</s>`;
            if (c.styles?.fontSize)
              text = `<span style="font-size:${c.styles.fontSize}">${text}</span>`;
            return text;
          })
          .join("") || "";

      switch (block.type) {
        case "heading":
          const level = block.props?.level || 1;
          return `<h${level}>${blockContent}</h${level}>`;
        case "bulletListItem":
          return `<li>${blockContent}</li>`;
        case "numberedListItem":
          return `<li>${blockContent}</li>`;
        case "image": {
          const url = block.props?.url || "";
          const caption = block.props?.caption || "";
          const pw = block.props?.previewWidth;
          if (!url) return "";
          const ws = pw ? ` style="width:${pw}px;max-width:100%"` : "";
          return caption
            ? `<figure${ws}><img src="${url}" alt="${caption}"${ws} /><figcaption>${caption}</figcaption></figure>`
            : `<img src="${url}" alt=""${ws} />`;
        }
        case "paragraph":
        default:
          return blockContent ? `<p>${blockContent}</p>` : "";
      }
    })
    .join("\n");
}

// 마크다운을 HTML로 변환하는 간단한 함수
function markdownToHTML(markdown: string): string {
  if (!markdown) return "";

  let html = markdown;

  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/^[-*] (.+)$/gm, "<li>$1</li>");

  const paragraphs = html.split(/\n\n+/);
  html = paragraphs
    .map((p) => {
      if (p.startsWith("<h") || p.startsWith("<li>")) return p;
      if (p.trim() === "") return "";
      return `<p>${p.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");

  return html;
}

export { markdownToBlocks };
