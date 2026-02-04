import { useEffect, useState, useMemo } from 'react';
import { BlockNoteEditor, PartialBlock } from '@blocknote/core';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';

interface BlockNoteEditorProps {
  initialContent?: string; // JSON string of blocks
  onChange?: (content: string) => void;
  height?: string;
  placeholder?: string;
}

// 마크다운을 BlockNote 블록으로 변환하는 함수
function markdownToBlocks(markdown: string): PartialBlock[] {
  if (!markdown || markdown.trim() === '') {
    return [{ type: 'paragraph', content: [] }];
  }

  const blocks: PartialBlock[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // 빈 줄 처리
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 헤딩 처리 (# ~ ######)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({
        type: 'heading',
        props: { level: Math.min(level, 3) as 1 | 2 | 3 },
        content: [{ type: 'text', text: headingMatch[2] }],
      });
      i++;
      continue;
    }

    // 불릿 리스트 처리
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      blocks.push({
        type: 'bulletListItem',
        content: [{ type: 'text', text: bulletMatch[1] }],
      });
      i++;
      continue;
    }

    // 번호 리스트 처리
    const numberMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberMatch) {
      blocks.push({
        type: 'numberedListItem',
        content: [{ type: 'text', text: numberMatch[1] }],
      });
      i++;
      continue;
    }

    // 인용문 처리
    const quoteMatch = line.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      blocks.push({
        type: 'paragraph',
        content: [{ type: 'text', text: quoteMatch[1] || '' }],
      });
      i++;
      continue;
    }

    // 수평선 처리
    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
      i++;
      continue;
    }

    // 일반 텍스트 (굵게, 기울임 처리)
    let text = line;
    // **굵게** 처리
    text = text.replace(/\*\*(.+?)\*\*/g, '$1');
    // *기울임* 처리
    text = text.replace(/\*(.+?)\*/g, '$1');
    
    blocks.push({
      type: 'paragraph',
      content: [{ type: 'text', text }],
    });
    i++;
  }

  return blocks.length > 0 ? blocks : [{ type: 'paragraph', content: [] }];
}

// BlockNote 블록을 마크다운으로 변환하는 함수
function blocksToMarkdown(blocks: any[]): string {
  if (!blocks || blocks.length === 0) return '';

  return blocks.map(block => {
    const content = block.content?.map((c: any) => c.text || '').join('') || '';
    
    switch (block.type) {
      case 'heading':
        const level = block.props?.level || 1;
        return '#'.repeat(level) + ' ' + content;
      case 'bulletListItem':
        return '- ' + content;
      case 'numberedListItem':
        return '1. ' + content;
      case 'paragraph':
      default:
        return content;
    }
  }).join('\n\n');
}

export default function BlockNoteEditorComponent({
  initialContent = '',
  onChange,
  height = '400px',
  placeholder = '내용을 입력하세요...',
}: BlockNoteEditorProps) {
  const [isClient, setIsClient] = useState(false);

  // 클라이언트 사이드 확인
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 초기 블록 파싱
  const initialBlocks = useMemo(() => {
    if (!initialContent) return undefined;
    
    // JSON 형식인지 확인
    try {
      const parsed = JSON.parse(initialContent);
      if (Array.isArray(parsed)) {
        return parsed as PartialBlock[];
      }
    } catch {
      // JSON이 아니면 마크다운으로 처리
      return markdownToBlocks(initialContent);
    }
    
    return undefined;
  }, [initialContent]);

  // BlockNote 에디터 생성
  const editor = useCreateBlockNote({
    initialContent: initialBlocks,
  });

  // 변경 감지 및 콜백
  useEffect(() => {
    if (!editor || !onChange) return;

    const handleChange = () => {
      const blocks = editor.document;
      // JSON 형식으로 저장
      onChange(JSON.stringify(blocks));
    };

    // 에디터 변경 이벤트 구독
    editor.onEditorContentChange(handleChange);
  }, [editor, onChange]);

  if (!isClient) {
    return (
      <div style={{ 
        height, 
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
      height, 
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

// JSON 블록을 HTML로 렌더링하는 유틸리티 함수 (프론트엔드용)
export function renderBlocksToHTML(content: string): string {
  if (!content) return '';

  let blocks: any[];
  
  try {
    blocks = JSON.parse(content);
    if (!Array.isArray(blocks)) {
      // 마크다운인 경우 간단한 HTML 변환
      return markdownToHTML(content);
    }
  } catch {
    // JSON이 아니면 마크다운으로 처리
    return markdownToHTML(content);
  }

  return blocks.map(block => {
    const content = block.content?.map((c: any) => {
      let text = c.text || '';
      // 스타일 적용
      if (c.styles?.bold) text = `<strong>${text}</strong>`;
      if (c.styles?.italic) text = `<em>${text}</em>`;
      if (c.styles?.underline) text = `<u>${text}</u>`;
      if (c.styles?.strike) text = `<s>${text}</s>`;
      return text;
    }).join('') || '';

    switch (block.type) {
      case 'heading':
        const level = block.props?.level || 1;
        return `<h${level}>${content}</h${level}>`;
      case 'bulletListItem':
        return `<li>${content}</li>`;
      case 'numberedListItem':
        return `<li>${content}</li>`;
      case 'paragraph':
      default:
        return content ? `<p>${content}</p>` : '';
    }
  }).join('\n');
}

// 마크다운을 HTML로 변환하는 간단한 함수
function markdownToHTML(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown;
  
  // 헤딩
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // 굵게
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // 기울임
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // 불릿 리스트
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  
  // 줄바꿈을 <p> 태그로
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(p => {
    if (p.startsWith('<h') || p.startsWith('<li>')) return p;
    if (p.trim() === '') return '';
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
  
  return html;
}

// Export 유틸리티 함수들
export { markdownToBlocks, blocksToMarkdown };
