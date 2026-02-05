import { useCallback, useEffect,useRef, useState } from 'react';

import { getEmail } from '@/lib/siteConfigService';
import { deleteOrderFile,uploadOrderFile } from '@/lib/supabase';

export default function Upload() {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [request, setRequest] = useState('');
  const [product, setProduct] = useState(null);

  useEffect(() => {
    const savedProduct = sessionStorage.getItem('checkoutProduct');
    if (!savedProduct) {
      window.location.href = '/';
      return;
    }
    setProduct(JSON.parse(savedProduct));
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileUpload = useCallback(async (file) => {
    setError(null);
    setIsUploading(true);

    try {
      const MAX_SIZE = 30 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        throw new Error('파일 크기가 30MB를 초과합니다. 이메일로 보내주세요.');
      }

      const orderId = `order_${Date.now()}`;
      const result = await uploadOrderFile(file, orderId);

      setUploadedFile({
        ...result,
        displayName: file.name,
        displaySize: formatFileSize(file.size)
      });
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || '파일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileUpload(files[0]);
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) handleFileUpload(files[0]);
  }, [handleFileUpload]);

  const handleDeleteFile = useCallback(async () => {
    if (!uploadedFile) return;
    try {
      await deleteOrderFile(uploadedFile.path);
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Delete error:', err);
      setUploadedFile(null);
    }
  }, [uploadedFile]);

  const handleNext = useCallback(() => {
    const currentProduct = JSON.parse(sessionStorage.getItem('checkoutProduct') || '{}');
    sessionStorage.setItem('checkoutProduct', JSON.stringify({
      ...currentProduct,
      file: uploadedFile ? {
        url: uploadedFile.url,
        path: uploadedFile.path,
        fileName: uploadedFile.fileName,
        fileSize: uploadedFile.fileSize
      } : null,
      request: request.trim() || null
    }));
    window.location.href = '/checkout';
  }, [uploadedFile, request]);

  const handleSkip = useCallback(() => {
    const currentProduct = JSON.parse(sessionStorage.getItem('checkoutProduct') || '{}');
    sessionStorage.setItem('checkoutProduct', JSON.stringify({
      ...currentProduct,
      file: null,
      fileSkipped: true,
      request: request.trim() || null
    }));
    window.location.href = '/checkout';
  }, [request]);

  if (!product) return null;

  return (
    <div className="min-h-screen bg-[#f5f7f7]">
      <header className="bg-white border-b border-[#d9d9d9]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold text-[#222828]">파일 업로드</h1>
          <p className="text-sm text-[#8a9292] mt-0.5">{product.name}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#222828]">인쇄 파일 업로드</h2>
            <p className="text-sm text-[#8a9292] mt-1">인쇄에 사용할 파일을 업로드해 주세요</p>
          </div>

          {!uploadedFile ? (
            <div
              className={`relative border-[1.5px] border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging ? 'border-[#222828] bg-[#f5f7f7]' : 'border-[#cbd0d0] hover:border-[#8a9292] bg-[#f5f7f7]'
              } ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect}
                accept=".pdf,.ai,.psd,.eps,.jpg,.jpeg,.png,.tif,.tiff,.zip" />
              {isUploading ? (
                <div className="py-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#222828] mx-auto mb-3"></div>
                  <p className="text-[#8a9292]">업로드 중...</p>
                </div>
              ) : (
                <>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#d9d9d9] mb-4">
                    <svg className="w-6 h-6 text-[#8a9292]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-[#222828] font-medium mb-1">파일 선택 또는 드래그앤드롭</p>
                  <p className="text-sm text-[#8a9292]">PDF, AI, PSD, EPS, JPG, PNG, TIF, ZIP</p>
                  <p className="text-xs text-[#8a9292] mt-2">최대 30MB</p>
                </>
              )}
            </div>
          ) : (
            <div className="border border-[#cbd0d0] rounded-xl p-4 bg-[#f5f7f7]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#222828] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#222828] truncate">{uploadedFile.displayName}</p>
                    <p className="text-xs text-[#8a9292]">{uploadedFile.displaySize}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="text-sm text-[#222828] hover:underline">변경</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(); }} className="w-8 h-8 rounded-full hover:bg-[#d9d9d9] flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4 text-[#8a9292]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect}
                accept=".pdf,.ai,.psd,.eps,.jpg,.jpeg,.png,.tif,.tiff,.zip" />
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-[#FFF5F5] border border-[#FFD0D0] rounded-xl">
              <p className="text-sm text-[#FF3B30]">{error}</p>
            </div>
          )}

          <div className="mt-6 p-4 bg-[#f5f7f7] border border-[#cbd0d0] rounded-xl">
            <p className="text-sm text-[#222828]">30MB 초과 시 이메일로 보내주세요</p>
            <a href={`mailto:${getEmail()}`} className="text-sm text-[#222828] hover:underline mt-1 inline-block">
              {getEmail()}
            </a>
          </div>

          <hr className="my-6 border-[#d9d9d9]" />

          <div>
            <label className="block text-sm font-medium text-[#222828] mb-2">
              요청사항 <span className="text-[#8a9292] font-normal">(선택)</span>
            </label>
            <textarea
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="인쇄에 관한 특별한 요청사항이 있으시면 입력해주세요"
              className="w-full px-4 py-3 border border-[#cbd0d0] rounded-xl text-sm text-[#222828] placeholder-[#8a9292] focus:outline-none focus:ring-2 focus:ring-[#222828] focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {!uploadedFile && (
            <div className="mt-6 text-center">
              <button onClick={handleSkip} className="text-sm text-[#8a9292] hover:text-[#222828] transition-colors">
                이 단계 건너뛰기
              </button>
              <p className="text-xs text-[#8a9292] mt-1">주문 후 이메일로 파일 전송</p>
            </div>
          )}

          <button
            onClick={handleNext}
            disabled={!uploadedFile}
            className={`w-full mt-6 py-3.5 rounded-xl text-sm font-medium transition-all ${
              uploadedFile
                ? 'bg-[#222828] text-white hover:bg-[#4a5050] active:bg-[#0f1111]'
                : 'bg-[#d9d9d9] text-[#8a9292] cursor-not-allowed'
            }`}
          >
            다음
          </button>
        </div>

        <div className="mt-4 text-center">
          <button onClick={() => window.history.back()} className="text-sm text-[#8a9292] hover:text-[#222828] transition-colors">
            이전으로
          </button>
        </div>
      </main>
    </div>
  );
}
