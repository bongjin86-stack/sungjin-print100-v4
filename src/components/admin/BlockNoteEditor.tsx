import { lazy, Suspense,useEffect, useMemo, useState } from 'react';

interface BlockNoteEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  height?: string;
  placeholder?: string;
}

// 마크다운을 BlockNote 블록으로 변환하는 함수
function markdownToBlocks(markdown: string): any[] {
  if (!markdown || markdown.trim() === '') {
    return [{ type: 'paragraph', content: [] }];
  }

  const blocks: any[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    if (line.trim() === '') {
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push({
        type: 'heading',
        props: { level: Math.min(level, 3) },
        content: [{ type: 'text', text: headingMatch[2] }],
      });
      i++;
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      blocks.push({
        type: 'bulletListItem',
        content: [{ type: 'text', text: bulletMatch[1] }],
      });
      i++;
      continue;
    }

    const numberMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberMatch) {
      blocks.push({
        type: 'numberedListItem',
        content: [{ type: 'text', text: numberMatch[1] }],
      });
      i++;
      continue;
    }

    const quoteMatch = line.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      blocks.push({
        type: 'paragraph',
        content: [{ type: 'text', text: quoteMatch[1] || '' }],
      });
      i++;
      continue;
    }

    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
      i++;
      continue;
    }

    let text = line;
    text = text.replace(/\*\*(.+?)\*\*/g, '$1');
    text = text.replace(/\*(.+?)\*/g, '$1');
    
    blocks.push({
      type: 'paragraph',
      content: [{ type: 'text', text }],
    });
    i++;
  }

  return blocks.length > 0 ? blocks : [{ type: 'paragraph', content: [] }];
}

// 실제 BlockNote 에디터 컴포넌트 (클라이언트에서만 로드)
function BlockNoteEditorInner({
  initialContent = '',
  onChange,
  height = '120px',
}: BlockNoteEditorProps) {
  const [editor, setEditor] = useState<any>(null);
  const [BlockNoteView, setBlockNoteView] = useState<any>(null);

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
          import('@blocknote/core'),
          import('@blocknote/react'),
          import('@blocknote/mantine'),
        ]);

        // Import CSS
        await import('@blocknote/mantine/style.css');

        if (!mounted) return;

        const newEditor = coreModule.BlockNoteEditor.create({
          initialContent: initialBlocks,
        });

        setEditor(newEditor);
        setBlockNoteView(() => mantineModule.BlockNoteView);
      } catch (error) {
        console.error('Failed to load BlockNote:', error);
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

  if (!editor || !BlockNoteView) {
    return (
      <div style={{
        minHeight: height,
        border: '1px solid #e5e7eb',
        borderRadius: '0.375rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        color: '#6b7280',
      }}>
        에디터 로딩 중...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: height,
      border: '1px solid #e5e7eb',
      borderRadius: '0.375rem',
      overflow: 'hidden',
    }}>
      <BlockNoteView
        editor={editor}
        theme="light"
      />
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
      <div style={{
        minHeight: props.height || '120px',
        border: '1px solid #e5e7eb',
        borderRadius: '0.375rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        color: '#6b7280',
      }}>
        에디터 로딩 중...
      </div>
    );
  }

  return <BlockNoteEditorInner {...props} />;
}

// JSON 블록을 HTML로 렌더링하는 유틸리티 함수 (프론트엔드용)
export function renderBlocksToHTML(content: string): string {
  if (!content) return '';

  let blocks: any[];
  
  try {
    blocks = JSON.parse(content);
    if (!Array.isArray(blocks)) {
      return markdownToHTML(content);
    }
  } catch {
    return markdownToHTML(content);
  }

  return blocks.map(block => {
    const blockContent = block.content?.map((c: any) => {
      let text = c.text || '';
      if (c.styles?.bold) text = `<strong>${text}</strong>`;
      if (c.styles?.italic) text = `<em>${text}</em>`;
      if (c.styles?.underline) text = `<u>${text}</u>`;
      if (c.styles?.strike) text = `<s>${text}</s>`;
      return text;
    }).join('') || '';

    switch (block.type) {
      case 'heading':
        const level = block.props?.level || 1;
        return `<h${level}>${blockContent}</h${level}>`;
      case 'bulletListItem':
        return `<li>${blockContent}</li>`;
      case 'numberedListItem':
        return `<li>${blockContent}</li>`;
      case 'paragraph':
      default:
        return blockContent ? `<p>${blockContent}</p>` : '';
    }
  }).join('\n');
}

// 마크다운을 HTML로 변환하는 간단한 함수
function markdownToHTML(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown;
  
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(p => {
    if (p.startsWith('<h') || p.startsWith('<li>')) return p;
    if (p.trim() === '') return '';
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
  
  return html;
}

export { markdownToBlocks };
