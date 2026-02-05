import { useEffect, useRef, useState } from 'react';

interface ToastEditorProps {
  initialValue?: string;
  onChange?: (content: string) => void;
  height?: string;
}

export default function ToastEditor({ 
  initialValue = '', 
  onChange,
  height = '500px' 
}: ToastEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 클라이언트 사이드에서만 Toast UI Editor 로드
    const loadEditor = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        // 동적 import로 Toast UI Editor 로드
        const { default: Editor } = await import('@toast-ui/editor');
        
        // CSS 로드
        await import('@toast-ui/editor/dist/toastui-editor.css');
        
        if (editorRef.current && !editorInstanceRef.current) {
          editorInstanceRef.current = new Editor({
            el: editorRef.current,
            height,
            initialEditType: 'markdown',
            previewStyle: 'tab',
            initialValue,
            usageStatistics: false,
            toolbarItems: [
              ['heading', 'bold', 'italic', 'strike'],
              ['hr', 'quote'],
              ['ul', 'ol', 'task', 'indent', 'outdent'],
              ['table', 'link'],
              ['code', 'codeblock'],
            ],
            placeholder: '내용을 입력하세요...',
          });

          // onChange 이벤트 연결
          if (onChange) {
            editorInstanceRef.current.on('change', () => {
              const content = editorInstanceRef.current.getMarkdown();
              onChange(content);
            });
          }

          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Toast UI Editor 로드 실패:', error);
      }
    };

    loadEditor();

    return () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
        editorInstanceRef.current = null;
      }
    };
  }, []);

  // initialValue가 변경되면 에디터 내용 업데이트
  useEffect(() => {
    if (editorInstanceRef.current && isLoaded && initialValue) {
      editorInstanceRef.current.setMarkdown(initialValue);
    }
  }, [initialValue, isLoaded]);

  return (
    <div className="toast-editor-wrapper">
      {!isLoaded && (
        <div className="editor-loading">
          에디터 로딩 중...
        </div>
      )}
      <div ref={editorRef} style={{ display: isLoaded ? 'block' : 'none' }} />
      <style>{`
        .toast-editor-wrapper {
          border: 1px solid var(--c-border, #d9d9d9);
          border-radius: var(--radius-lg, 8px);
          overflow: hidden;
        }
        .editor-loading {
          padding: 48px;
          text-align: center;
          color: var(--c-text-light, #8a9292);
          background: var(--c-bg, #fff);
        }
        .toastui-editor-defaultUI {
          border: none !important;
        }
        .toastui-editor-toolbar {
          background: var(--c-bg-secondary, #f5f7f7) !important;
          border-bottom: 1px solid var(--c-border-light, #f0f2f2) !important;
        }
      `}</style>
    </div>
  );
}

// 에디터 내용을 가져오는 함수를 외부에서 사용할 수 있도록 export
export function getEditorContent(editorElement: HTMLDivElement | null): string {
  if (!editorElement) return '';
  // @ts-ignore
  const editor = editorElement.__toastuiEditor;
  return editor ? editor.getMarkdown() : '';
}
