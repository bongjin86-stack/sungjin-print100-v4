/**
 * BlockNote JSON 블록을 HTML로 렌더링하는 유틸리티
 * 프론트엔드에서 DB에 저장된 JSON 블록 콘텐츠를 표시할 때 사용
 */

import DOMPurify from 'isomorphic-dompurify';

interface BlockContent {
  type: string;
  text?: string;
  styles?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    code?: boolean;
  };
}

interface Block {
  id?: string;
  type: string;
  props?: {
    level?: number;
    textColor?: string;
    backgroundColor?: string;
    textAlignment?: string;
  };
  content?: BlockContent[];
  children?: Block[];
}

/**
 * 인라인 콘텐츠를 HTML로 변환
 */
function renderInlineContent(content: BlockContent[] | undefined): string {
  if (!content || content.length === 0) return '';
  
  return content.map(item => {
    let text = item.text || '';
    
    // 스타일 적용
    if (item.styles) {
      if (item.styles.bold) text = `<strong>${text}</strong>`;
      if (item.styles.italic) text = `<em>${text}</em>`;
      if (item.styles.underline) text = `<u>${text}</u>`;
      if (item.styles.strike) text = `<s>${text}</s>`;
      if (item.styles.code) text = `<code>${text}</code>`;
    }
    
    return text;
  }).join('');
}

/**
 * 단일 블록을 HTML로 변환
 */
function renderBlock(block: Block): string {
  const content = renderInlineContent(block.content);
  
  switch (block.type) {
    case 'heading':
      const level = block.props?.level || 1;
      return `<h${level}>${content}</h${level}>`;
      
    case 'paragraph':
      return content ? `<p>${content}</p>` : '';
      
    case 'bulletListItem':
      return `<li>${content}</li>`;
      
    case 'numberedListItem':
      return `<li>${content}</li>`;
      
    case 'checkListItem':
      return `<li>${content}</li>`;
      
    case 'codeBlock':
      return `<pre><code>${content}</code></pre>`;
      
    case 'table':
      // 테이블 처리 (간단한 버전)
      return `<table>${content}</table>`;
      
    case 'image':
      const url = (block.props as any)?.url || '';
      const alt = (block.props as any)?.caption || '';
      return url ? `<img src="${url}" alt="${alt}" />` : '';
      
    default:
      return content ? `<p>${content}</p>` : '';
  }
}

/**
 * 리스트 아이템들을 그룹화하여 ul/ol로 감싸기
 */
function groupListItems(blocks: Block[]): string {
  const result: string[] = [];
  let currentListType: string | null = null;
  let currentListItems: string[] = [];
  
  const flushList = () => {
    if (currentListItems.length > 0) {
      const tag = currentListType === 'numberedListItem' ? 'ol' : 'ul';
      result.push(`<${tag}>${currentListItems.join('')}</${tag}>`);
      currentListItems = [];
    }
    currentListType = null;
  };
  
  for (const block of blocks) {
    if (block.type === 'bulletListItem' || block.type === 'numberedListItem') {
      if (currentListType && currentListType !== block.type) {
        flushList();
      }
      currentListType = block.type;
      currentListItems.push(renderBlock(block));
    } else {
      flushList();
      result.push(renderBlock(block));
    }
  }
  
  flushList();
  return result.join('\n');
}

/**
 * BlockNote JSON 블록 배열을 HTML로 변환
 * @param content - JSON 문자열 또는 블록 배열
 * @returns HTML 문자열
 */
export function renderBlocksToHTML(content: string | Block[]): string {
  if (!content) return '';
  
  let blocks: Block[];
  
  if (typeof content === 'string') {
    // JSON 파싱 시도
    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        // JSON이지만 배열이 아니면 마크다운으로 처리
        return markdownToHTML(content);
      }
      blocks = parsed;
    } catch {
      // JSON이 아니면 마크다운으로 처리
      return markdownToHTML(content);
    }
  } else {
    blocks = content;
  }
  
  // 빈 블록 필터링
  const nonEmptyBlocks = blocks.filter(block => {
    if (!block.content || block.content.length === 0) return false;
    return block.content.some(c => c.text && c.text.trim() !== '');
  });
  
  if (nonEmptyBlocks.length === 0) return '';

  return DOMPurify.sanitize(groupListItems(nonEmptyBlocks));
}

/**
 * 마크다운을 HTML로 변환 (기존 데이터 호환용)
 */
export function markdownToHTML(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown;
  
  // 헤딩 (순서 중요: ### 먼저)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // 굵게
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // 기울임
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // 인라인 코드
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  
  // 불릿 리스트 처리
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletMatch = line.match(/^[-*] (.+)$/);
    
    if (bulletMatch) {
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      processedLines.push(`<li>${bulletMatch[1]}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push(line);
    }
  }
  
  if (inList) {
    processedLines.push('</ul>');
  }
  
  html = processedLines.join('\n');
  
  // 빈 줄로 구분된 단락을 <p> 태그로 감싸기
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    // 이미 HTML 태그로 시작하면 그대로 반환
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<li') || trimmed.startsWith('<pre')) {
      return trimmed;
    }
    // 단일 줄바꿈을 <br>로 변환
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).filter(p => p).join('\n');

  return DOMPurify.sanitize(html);
}

/**
 * 콘텐츠가 BlockNote JSON 형식인지 확인
 */
export function isBlockNoteJSON(content: string): boolean {
  if (!content) return false;
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) && parsed.length > 0 && parsed[0].type !== undefined;
  } catch {
    return false;
  }
}
