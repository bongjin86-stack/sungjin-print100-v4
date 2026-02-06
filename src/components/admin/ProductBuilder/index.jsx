// ============================================================
// AdminBuilder.jsx - 블록 시스템 업그레이드 v2
// - 스프링제본: PP + 표지인쇄 분리 + 연동
// - 내지 레이어 블록 (중철/낱장)
// - 블록 설정: 선택/필수, 고정, 숨김, 기본값
// ============================================================

import { useEffect, useRef,useState } from 'react';

import Sortable from 'sortablejs';

import BlockNoteEditor from '@/components/admin/BlockNoteEditor';
import { BLOCK_TYPES, DB, getDefaultCustomer, LINK_RULES,TEMPLATES as DEFAULT_TEMPLATES } from '@/lib/builderData';
import { formatBusinessDate,getBusinessDate } from '@/lib/businessDays';
import { loadPricingData } from '@/lib/dbService';
import { getIconComponent,ICON_LIST } from '@/lib/highlightIcons';
import { calculatePrice, validateCoatingWeight } from '@/lib/priceEngine';
import { supabase, uploadImage } from '@/lib/supabase';

import BlockItem, { getBlockSummary } from './BlockItem';
import BlockLibraryModal from './BlockLibraryModal';
import BlockSettings from './BlockSettings';
import PriceDisplay from './PriceDisplay';
// PreviewBlock은 shared 컴포넌트 사용 (ProductView와 동일)
import { PreviewBlock } from '@/components/shared/PreviewBlock';
import ProductEditor from './ProductEditor';
import TemplateSelector from './TemplateSelector';


// 기본 콘텐츠 생성 함수
function getDefaultContent(name) {
  const contents = {
    '전단지': {
      title: '전단지',
      description: '고품질 전단지 인쇄 서비스',
      features: ['다양한 용지 선택 가능', '컬러/흑백 인쇄', '빠른 출고', '합리적인 가격'],
      mainImage: null,
      thumbnails: [null, null, null, null],
      highlights: [
        { icon: 'Printer', title: '고품질 인쇄', desc: '최신 인쇄 장비로 선명한 출력' },
        { icon: 'Truck', title: '빠른 배송', desc: '주문 후 1~3일 내 출고' }
      ]
    },
    '무선제본': {
      title: '무선제본',
      description: '깔끔한 무선제본 인쇄 서비스',
      features: ['표지/내지 분리 설정', '다양한 페이지 수', '고급 표지 코팅', '전문 제본'],
      mainImage: null,
      thumbnails: [null, null, null, null],
      highlights: [
        { icon: 'BookOpen', title: '전문 제본', desc: '깔끔하고 튼튼한 무선제본' },
        { icon: 'Sparkles', title: '고급 마감', desc: '표지 코팅으로 고급스러운 느낌' }
      ]
    },
    '중철제본': {
      title: '중철제본',
      description: '가성비 좋은 중철제본 인쇄 서비스',
      features: ['얇은 책자에 적합', '경제적인 가격', '빠른 제작', '깔끔한 마감'],
      mainImage: null,
      thumbnails: [null, null, null, null],
      highlights: [
        { icon: 'Paperclip', title: '심플한 제본', desc: '가볍고 깔끔한 중철제본' },
        { icon: 'CircleDollarSign', title: '경제적', desc: '합리적인 가격의 제본 서비스' }
      ]
    },
    '스프링제본': {
      title: '스프링제본',
      description: '편리한 스프링제본 인쇄 서비스',
      features: ['180도 펼침 가능', 'PP 표지 선택', '다양한 스프링 색상', '튼튼한 제본'],
      mainImage: null,
      thumbnails: [null, null, null, null],
      highlights: [
        { icon: 'Link2', title: '편리한 사용', desc: '180도 완전히 펼쳐지는 스프링' },
        { icon: 'Shield', title: '내구성', desc: 'PP 표지로 오래 사용 가능' }
      ]
    }
  };
  return contents[name] || {
    title: name,
    description: '',
    features: ['', '', '', ''],
    mainImage: null,
    thumbnails: [null, null, null, null],
    highlights: [
      { icon: 'FileText', title: '', desc: '' },
      { icon: 'Sparkles', title: '', desc: '' }
    ]
  };
}

export default function AdminBuilder() {
  const urlProductId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null;

  // 템플릿 목록 상태
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('sungjin_templates_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('템플릿 로드 실패:', e);
      }
    }
    return Object.entries(DEFAULT_TEMPLATES).map(([key, template], idx) => ({
      id: key,
      order: idx,
      icon: key === 'flyer' ? '📄' : key === 'perfect' ? '📚' : key === 'saddle' ? '📎' : '🔗',
      ...template,
      content: getDefaultContent(template.name)
    }));
  });

  // URL에서 id가 있으면 해당 템플릿으로, 없으면 첫 번째 템플릿
  const [currentTemplateId, setCurrentTemplateId] = useState(() => {
    if (urlProductId) {
      const saved = localStorage.getItem('sungjin_templates_v4');
      if (saved) {
        const savedTemplates = JSON.parse(saved);
        const found = savedTemplates.find(t => t.id === urlProductId);
        if (found) return urlProductId;
      }
    }
    return templates[0]?.id || 'flyer';
  });

  const [currentProduct, setCurrentProduct] = useState(() => {
    // URL에서 id가 있으면 해당 템플릿 로드
    if (urlProductId) {
      const saved = localStorage.getItem('sungjin_templates_v4');
      if (saved) {
        const savedTemplates = JSON.parse(saved);
        const found = savedTemplates.find(t => t.id === urlProductId);
        if (found) {
          return { ...found, blocks: found.blocks.map(b => ({ ...b, config: { ...b.config } })) };
        }
      }
    }
    // 기본값: 첫 번째 템플릿
    const template = templates[0];
    return template ? { ...template, blocks: template.blocks.map(b => ({ ...b, config: { ...b.config } })) } : null;
  });

  const [customer, setCustomer] = useState(getDefaultCustomer());
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [labelInput, setLabelInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [newQtyInput, setNewQtyInput] = useState('');
  const [showBlockLibrary, setShowBlockLibrary] = useState(false);

  // 템플릿 편집 상태
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [editingTemplateName, setEditingTemplateName] = useState('');

  // DB에서 로드한 용지 데이터 (이름, 설명, 이미지)
  const [dbPapers, setDbPapers] = useState({});
  // DB에서 로드한 용지 목록 (sort_order 순서 유지)
  const [dbPapersList, setDbPapersList] = useState([]);
  // DB 데이터 로드 완료 여부
  const [dbLoaded, setDbLoaded] = useState(false);

  // 상품 이미지 업로드 상태
  const [imageUploading, setImageUploading] = useState(false);

  const blockListRef = useRef(null);
  const templateListRef = useRef(null);
  const mainImageRef = useRef(null);
  const thumbImageRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // localStorage 저장
  useEffect(() => {
    localStorage.setItem('sungjin_templates_v4', JSON.stringify(templates));
  }, [templates]);

  // URL 파라미터 변경 시 해당 상품 로드 (DB 우선)
  // dbLoaded 플래그로 이미 로드된 경우 스킵
  const [dbProductLoaded, setDbProductLoaded] = useState(false);

  useEffect(() => {
    async function loadProductFromDB() {
      console.log('[Builder] useEffect 실행 - urlProductId:', urlProductId, ', dbProductLoaded:', dbProductLoaded);

      if (!urlProductId) {
        console.log('[Builder] urlProductId 없음, 스킵');
        return;
      }

      if (dbProductLoaded) {
        console.log('[Builder] 이미 로드됨, 스킵');
        return;
      }

      // 1. DB에서 먼저 상품 로드 시도 (실제 저장된 상품)
      console.log('[Builder] DB에서 로드 시도:', urlProductId);
      try {
        const { data: product, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', urlProductId)
          .single();

        console.log('[Builder] DB 응답:', { product, error });

        if (error || !product) {
          console.warn('[Builder] DB에서 상품을 찾을 수 없음, localStorage fallback 시도:', urlProductId);
          // 2. DB에 없으면 localStorage에서 찾기 (새 상품 작업 중일 수 있음)
          const localFound = templates.find(t => t.id === urlProductId);
          if (localFound) {
            console.log('[Builder] localStorage에서 찾음:', localFound.name);
            setCurrentTemplateId(urlProductId);
            setCurrentProduct({ ...localFound, blocks: localFound.blocks.map(b => ({ ...b, config: { ...b.config } })) });
            setCustomer(extractDefaultsFromBlocks(localFound.blocks));
            setDbProductLoaded(true);
          }
          return;
        }

        // JSON 파싱 헬퍼 (문자열이면 파싱, 객체면 그대로)
        const parseJson = (val, fallback) => {
          if (!val) return fallback;
          if (typeof val === 'object') return val;
          try { return JSON.parse(val); } catch { return fallback; }
        };

        const parsedContent = parseJson(product.content, {});
        const parsedBlocks = parseJson(product.blocks, []);

        console.log('[Builder] 파싱된 content:', parsedContent);
        console.log('[Builder] 파싱된 blocks:', parsedBlocks);

        // DB 상품 데이터를 빌더 형식으로 변환
        const builderProduct = {
          id: product.id,
          name: product.name,
          product_type: product.product_type,
          blocks: parsedBlocks,
          content: {
            title: parsedContent.title || product.name,
            description: parsedContent.description || product.description || '',
            mainImage: parsedContent.mainImage || product.main_image || null,
            thumbnails: parsedContent.thumbnails || [],
            features: parsedContent.features || [],
            featuresHtml: parsedContent.featuresHtml || null,
            highlights: parsedContent.highlights || []
          },
          is_published: product.is_published
        };

        console.log('[Builder] 변환된 builderProduct:', builderProduct);

        setCurrentTemplateId(urlProductId);
        setCurrentProduct({
          ...builderProduct,
          blocks: builderProduct.blocks.map(b => ({ ...b, config: { ...b.config } }))
        });
        setCustomer(extractDefaultsFromBlocks(builderProduct.blocks));
        setDbProductLoaded(true);

        console.log('[Builder] DB에서 상품 로드 완료:', product.name);
      } catch (err) {
        console.error('[Builder] 상품 로드 오류:', err);
      }
    }

    loadProductFromDB();
  }, [urlProductId, dbProductLoaded, templates]);

  // 초기 로드 시 블록 기본값 적용
  useEffect(() => {
    if (currentProduct?.blocks) {
      setCustomer(extractDefaultsFromBlocks(currentProduct.blocks));
    }
  }, []); // 초기 마운트 시 1회만 실행

  // DB에서 용지 데이터 로드 (이름, 설명, 이미지)
  useEffect(() => {
    async function loadDbPapers() {
      try {
        const data = await loadPricingData();
        if (data?.papers) {
          // 용지 맵 (코드 -> 정보)
          const paperMap = {};
          data.papers.forEach(p => {
            paperMap[p.code] = {
              name: p.name,
              desc: p.description || '',
              image_url: p.image_url || null
            };
          });
          setDbPapers(paperMap);
          // 용지 목록 (sort_order 순서 유지)
          setDbPapersList(data.papers.map(p => ({
            code: p.code,
            name: p.name,
            desc: p.description || ''
          })));
        }
        setDbLoaded(true);
      } catch (err) {
        console.error('용지 데이터 로드 실패:', err);
        setDbLoaded(true);
      }
    }
    loadDbPapers();
  }, []);

  // 블록 드래그앤드롭
  useEffect(() => {
    let sortableInstance = null;

    if (blockListRef.current) {
      sortableInstance = Sortable.create(blockListRef.current, {
        animation: 200,
        handle: '.drag-handle',
        ghostClass: 'opacity-50',
        chosenClass: 'shadow-lg',
        dragClass: 'rotate-1',
        onEnd: (evt) => {
          const { oldIndex, newIndex } = evt;
          if (oldIndex === newIndex) return;

          setCurrentProduct(prev => {
            const newBlocks = [...prev.blocks];
            const [movedItem] = newBlocks.splice(oldIndex, 1);
            newBlocks.splice(newIndex, 0, movedItem);
            return { ...prev, blocks: newBlocks };
          });
        }
      });
    }

    return () => {
      if (sortableInstance) {
        sortableInstance.destroy();
      }
    };
  }, [currentProduct?.id]);

  // 템플릿 드래그앤드롭
  useEffect(() => {
    if (templateListRef.current) {
      Sortable.create(templateListRef.current, {
        animation: 150,
        onEnd: (evt) => {
          const newTemplates = [...templates];
          const [removed] = newTemplates.splice(evt.oldIndex, 1);
          newTemplates.splice(evt.newIndex, 0, removed);
          newTemplates.forEach((t, i) => t.order = i);
          setTemplates(newTemplates);
        }
      });
    }
  }, [templates.length]);

  // 연동 규칙 체크 (스프링제본: 앞뒤표지 선택 시 뒷판 비활성화)
  const checkLinkRules = () => {
    const coverPrintBlock = currentProduct?.blocks?.find(b => b.type === 'cover_print');
    const backBlock = currentProduct?.blocks?.find(b => b.type === 'back');

    if (coverPrintBlock && backBlock) {
      // 앞뒤표지 선택 시 뒷판 비활성화
      if (customer.coverPrint === 'front_back') {
        return { backDisabled: true };
      }
    }

    // PP와 표지인쇄 둘 다 없음인지 체크
    const ppBlock = currentProduct?.blocks?.find(b => b.type === 'pp');
    if (ppBlock && coverPrintBlock) {
      if (customer.pp === 'none' && customer.coverPrint === 'none') {
        return { error: '전면 커버(PP 또는 표지인쇄) 중 하나는 선택해야 합니다.' };
      }
    }

    return {};
  };

  const linkStatus = checkLinkRules();

  // 접지 선택 핸들러 (130g 이상 용지에서 오시 자동 활성화)
  const handleFoldSelect = (foldOpt, cfg) => {
    // 현재 선택된 용지 무게 확인
    const currentWeight = customer.weight || 100;
    const needsOsi = currentWeight >= 150;

    // 오시 줄 수 계산 (2단→1줄, 3단→2줄, 4단→3줄)
    const osiLines = foldOpt - 1;

    if (foldOpt === customer.finishing?.fold && customer.finishing?.foldEnabled) {
      // 이미 선택된 값을 다시 클릭하면 해제 → 오시도 같이 해제
      setCustomer(prev => ({
        ...prev,
        finishing: {
          ...prev.finishing,
          foldEnabled: false,
          fold: null,
          osiEnabled: false,
          osi: null
        }
      }));
    } else {
      // 새로운 값 선택
      setCustomer(prev => ({
        ...prev,
        finishing: {
          ...prev.finishing,
          foldEnabled: true,
          fold: foldOpt,
          // 150g 이상 용지에서는 오시 자동 활성화
          ...(needsOsi && cfg.osi?.enabled ? {
            osiEnabled: true,
            osi: osiLines
          } : {})
        }
      }));
    }
  };

  // 상품 이미지 업로드 핸들러
  const handleMainImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setImageUploading(true);
      const path = `products/${currentTemplateId}/main.${file.name.split('.').pop()}`;
      const url = await uploadImage(path, file);
      setCurrentProduct(prev => ({
        ...prev,
        content: { ...prev.content, mainImage: url }
      }));
    } catch (err) {
      alert('이미지 업로드 실패: ' + err.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleThumbnailUpload = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setImageUploading(true);
      const path = `products/${currentTemplateId}/thumb-${index}.${file.name.split('.').pop()}`;
      const url = await uploadImage(path, file);
      setCurrentProduct(prev => {
        const newThumbnails = [...(prev.content.thumbnails || [null, null, null, null])];
        newThumbnails[index] = url;
        return {
          ...prev,
          content: { ...prev.content, thumbnails: newThumbnails }
        };
      });
    } catch (err) {
      alert('썸네일 업로드 실패: ' + err.message);
    } finally {
      setImageUploading(false);
    }
  };

  // 템플릿 선택 (현재 템플릿 자동 저장 후 전환)
  // 블록 설정에서 기본값 추출하여 customer 객체 생성
  const extractDefaultsFromBlocks = (blocks) => {
    const defaults = { ...getDefaultCustomer() };
    if (!blocks) return defaults;

    blocks.forEach(block => {
      if (!block.on) return;
      const cfg = block.config;
      if (!cfg) return;

      switch (block.type) {
        case 'size':
          if (cfg.default) defaults.size = cfg.default;
          break;
        case 'paper':
          if (cfg.default?.paper) defaults.paper = cfg.default.paper;
          if (cfg.default?.weight) defaults.weight = cfg.default.weight;
          break;
        case 'print': {
          // 제본 상품에서 내지인쇄는 innerColor/innerSide 키 사용
          const isInnerPrint = blocks.some(b => b.config?.linkedBlocks?.innerPrint === block.id);
          if (isInnerPrint) {
            if (cfg.default?.color) defaults.innerColor = cfg.default.color;
            if (cfg.default?.side) defaults.innerSide = cfg.default.side;
          } else {
            if (cfg.default?.color) defaults.color = cfg.default.color;
            if (cfg.default?.side) defaults.side = cfg.default.side;
          }
          break;
        }
        case 'quantity':
          if (cfg.default) defaults.qty = cfg.default;
          break;
        case 'delivery':
          if (cfg.default) {
            defaults.delivery = cfg.default;
            const opts = cfg.options || [];
            const defaultOpt = opts.find(o => o.id === cfg.default);
            if (defaultOpt) defaults.deliveryPercent = defaultOpt.percent;
          }
          break;
        case 'pages':
        case 'pages_saddle':
        case 'pages_leaf':
          if (cfg.default) defaults.pages = cfg.default;
          break;
        case 'pp':
          if (cfg.default) defaults.pp = cfg.default;
          break;
        case 'back':
          if (cfg.default) defaults.back = cfg.default;
          break;
        case 'spring_color':
          if (cfg.default) defaults.springColor = cfg.default;
          break;
        case 'finishing':
          if (cfg.default) {
            const hasCoating = cfg.default.coating || !!cfg.default.coatingType || !!cfg.default.coatingSide;
            defaults.finishing = {
              ...defaults.finishing,
              coating: hasCoating,
              coatingType: hasCoating ? (cfg.default.coatingType || 'matte') : null,
              coatingSide: hasCoating ? (cfg.default.coatingSide || 'single') : null,
              corner: cfg.default.corner || false,
              punch: cfg.default.punch || false,
              mising: cfg.default.mising || false,
            };
          }
          break;
        case 'cover_print':
          if (cfg.default) defaults.coverPrint = cfg.default;
          if (cfg.defaultPaper?.paper) defaults.coverPaper = cfg.defaultPaper.paper;
          if (cfg.defaultPaper?.weight) defaults.coverWeight = cfg.defaultPaper.weight;
          break;
        case 'inner_layer_saddle':
        case 'inner_layer_leaf':
          if (cfg.defaultPaper?.paper) defaults.innerPaper = cfg.defaultPaper.paper;
          if (cfg.defaultPaper?.weight) defaults.innerWeight = cfg.defaultPaper.weight;
          if (cfg.defaultPrint?.color) defaults.innerColor = cfg.defaultPrint.color;
          if (cfg.defaultPrint?.side) defaults.innerSide = cfg.defaultPrint.side;
          if (cfg.defaultPages) defaults.pages = cfg.defaultPages;
          break;
      }
    });

    return defaults;
  };

  const selectTemplate = (id) => {
    // 현재 템플릿 변경사항을 templates에 먼저 저장
    const updatedTemplates = templates.map(t =>
      t.id === currentTemplateId ? { ...currentProduct } : t
    );
    setTemplates(updatedTemplates);

    // 새 템플릿 선택 (업데이트된 배열에서 조회)
    const template = updatedTemplates.find(t => t.id === id);
    if (template) {
      setCurrentTemplateId(id);
      setCurrentProduct({ ...template, blocks: template.blocks.map(b => ({ ...b, config: { ...b.config } })) });
      setSelectedBlockId(null);
      // 블록 기본값을 적용한 customer 초기화
      setCustomer(extractDefaultsFromBlocks(template.blocks));
    }
  };

  // 템플릿 이름 수정
  const startEditTemplateName = (id, name) => {
    setEditingTemplateId(id);
    setEditingTemplateName(name);
  };

  const finishEditTemplateName = () => {
    if (editingTemplateId && editingTemplateName.trim()) {
      setTemplates(prev => prev.map(t =>
        t.id === editingTemplateId ? { ...t, name: editingTemplateName.trim() } : t
      ));
      if (currentProduct?.id === editingTemplateId) {
        setCurrentProduct(prev => ({ ...prev, name: editingTemplateName.trim() }));
      }
    }
    setEditingTemplateId(null);
    setEditingTemplateName('');
  };

  // 템플릿 아이콘 변경
  const changeTemplateIcon = (id) => {
    const icons = ['📄', '📚', '📎', '🔗', '📖', '📑', '📋', '📝', '🗂️', '📁'];
    const template = templates.find(t => t.id === id);
    const currentIdx = icons.indexOf(template?.icon) || 0;
    const nextIcon = icons[(currentIdx + 1) % icons.length];

    setTemplates(prev => prev.map(t => t.id === id ? { ...t, icon: nextIcon } : t));
    if (currentProduct?.id === id) {
      setCurrentProduct(prev => ({ ...prev, icon: nextIcon }));
    }
  };

  // 템플릿 삭제
  const deleteTemplate = (id) => {
    if (templates.length <= 1) {
      alert('최소 1개의 템플릿이 필요합니다.');
      return;
    }
    if (confirm('이 템플릿을 삭제하시겠습니까?')) {
      const newTemplates = templates.filter(t => t.id !== id);
      setTemplates(newTemplates);
      if (currentTemplateId === id) {
        selectTemplate(newTemplates[0].id);
      }
    }
  };

  // 새 템플릿 저장
  const saveAsTemplate = () => {
    const newId = `template_${Date.now()}`;
    const newTemplate = {
      ...currentProduct,
      id: newId,
      order: templates.length,
      name: currentProduct.name + ' (복사)',
      blocks: currentProduct.blocks.map(b => ({ ...b, config: { ...b.config } }))
    };
    setTemplates(prev => [...prev, newTemplate]);
    setCurrentTemplateId(newId);
    setCurrentProduct(newTemplate);
  };

  // 현재 템플릿 업데이트
  const updateCurrentTemplate = () => {
    setTemplates(prev => prev.map(t =>
      t.id === currentTemplateId ? { ...currentProduct } : t
    ));

    // Supabase 저장
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: currentProduct.id,
        name: currentProduct.name,
        description: currentProduct.content?.description || '',
        main_image: currentProduct.content?.mainImage || null,
        icon: currentProduct.icon || '📄',
        sort_order: currentProduct.order ?? 0,
        content: currentProduct.content || {},
        blocks: currentProduct.blocks || [],
        product_type: currentProduct.productType || null,
        is_published: true
      })
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        alert('변경사항이 적용되었습니다.');
      })
      .catch(err => {
        console.error('Supabase 저장 실패:', err);
        alert('저장에 실패했습니다. 다시 시도해주세요.');
      });
  };

  // 블록 ON/OFF
  const toggleBlock = (id) => {
    setCurrentProduct(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === id ? { ...b, on: !b.on } : b)
    }));
  };

  // 블록 설정 토글
  const toggleEdit = (id) => {
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    } else {
      setSelectedBlockId(id);
      const block = currentProduct.blocks.find(b => b.id === id);
      setLabelInput(block?.label || '');
      setDescInput(block?.desc || '');
    }
  };

  // 블록 삭제
  const removeBlock = (id) => {
    setCurrentProduct(prev => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.id !== id)
    }));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  // 블록 추가
  const addBlock = (type) => {
    const blockType = BLOCK_TYPES[type];
    const newBlock = {
      id: crypto.randomUUID(),
      type,
      label: blockType.name,
      desc: blockType.desc || '',  // 블록 설명
      on: true,
      optional: true,  // 기본값: 선택
      locked: false,   // 기본값: 고정 안함
      hidden: false,   // 기본값: 숨김 안함
      config: getDefaultConfig(type)
    };
    setCurrentProduct(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock]
    }));
    setShowBlockLibrary(false);
  };

  // 블록 타입별 기본 config
  const getDefaultConfig = (type) => {
    switch (type) {
      case 'size':
        return { options: ['a4', 'a5', 'b5'], default: 'a4' };
      case 'paper':
        return { papers: { snow: [120, 150], mojo: [80, 100] }, default: { paper: 'snow', weight: 120 } };
      case 'print':
        return { color: true, mono: true, single: true, double: true, default: { color: 'color', side: 'double' } };

      case 'finishing':
        return { corner: true, punch: true, mising: false, default: {} };
      case 'pp':
        return { options: ['clear', 'frosted', 'none'], default: 'clear' };
      case 'cover_print':
        return {
          options: ['none', 'front_only', 'front_back'],
          default: 'none',
          papers: { snow: [200, 250], mojo: [150, 180] },
          defaultPaper: { paper: 'snow', weight: 200 }
        };
      case 'back':
        return { options: ['white', 'black', 'none'], default: 'white' };
      case 'spring_color':
        return { options: ['black', 'white'], default: 'black' };
      case 'delivery':
        return {
          options: [
            { id: 'same', label: '당일', enabled: false, percent: 30 },
            { id: 'next1', label: '1영업일', enabled: true, percent: 15 },
            { id: 'next2', label: '2영업일', enabled: true, percent: 0 },
            { id: 'next3', label: '3영업일', enabled: true, percent: -5 },
          ],
          default: 'next2',
          cutoffTime: '12:00'
        };
      case 'quantity':
        return { options: [50, 100, 200, 500, 1000], default: 100 };
      case 'inner_layer_saddle':
        return {
          papers: { mojo: [80, 100], snow: [100, 120] },
          defaultPaper: { paper: 'mojo', weight: 80 },
          color: true, mono: true, single: false, double: true,
          defaultPrint: { color: 'color', side: 'double' },
          min: 8, max: 48, step: 4, defaultPages: 16,
          formula: 'pages - 4',
          paperLocked: false, paperHidden: false,
          printColorLocked: false, printColorHidden: false,
          printSideLocked: true, printSideHidden: true,
          pagesLocked: false, pagesHidden: false,
        };
      case 'inner_layer_leaf':
        return {
          papers: { mojo: [80, 100], snow: [100, 120] },
          defaultPaper: { paper: 'mojo', weight: 80 },
          color: true, mono: true, single: true, double: true,
          defaultPrint: { color: 'color', side: 'double' },
          min: 10, max: 500, step: 2, defaultPages: 50,
          paperLocked: false, paperHidden: false,
          printColorLocked: false, printColorHidden: false,
          printSideLocked: false, printSideHidden: false,
          pagesLocked: false, pagesHidden: false,
        };
      case 'pages_saddle':
        return { min: 8, max: 48, step: 4, default: 16, maxThickness: 2.5 };
      case 'pages_leaf':
        return { min: 10, max: 500, step: 2, default: 50, maxThickness: 50 };
      case 'pages':
        return {
          min: 8, max: 48, step: 4, default: 16,
          maxThickness: 2.5, // mm, 제본 두께 제한 (중철: 2.5, 무선: 50, 스프링: 20)
          bindingType: 'saddle',
          linkedBlocks: {}
        };
      default:
        return {};
    }
  };

  // 설정 적용 + 기본값을 customer에 반영
  const applySettings = (id, newLabel, newDesc) => {
    const block = currentProduct.blocks.find(b => b.id === id);
    if (block) {
      const cfg = block.config;

      // 블록 타입별로 config.default를 customer에 반영
      setCustomer(prev => {
        const next = { ...prev };
        switch (block.type) {
          case 'size':
            if (cfg.default) next.size = cfg.default;
            break;
          case 'paper':
            if (cfg.default?.paper) next.paper = cfg.default.paper;
            if (cfg.default?.weight) next.weight = cfg.default.weight;
            break;
          case 'print': {
            const isInner = currentProduct.blocks.some(b => b.config?.linkedBlocks?.innerPrint === block.id);
            if (isInner) {
              if (cfg.default?.color) next.innerColor = cfg.default.color;
              if (cfg.default?.side) next.innerSide = cfg.default.side;
            } else {
              if (cfg.default?.color) next.color = cfg.default.color;
              if (cfg.default?.side) next.side = cfg.default.side;
            }
            break;
          }
          case 'quantity':
            if (cfg.default) next.qty = cfg.default;
            break;
          case 'delivery':
            if (cfg.default) next.delivery = cfg.default;
            break;
          case 'pages':
          case 'pages_saddle':
          case 'pages_leaf':
            if (cfg.default) next.pages = cfg.default;
            break;
          case 'pp':
            if (cfg.default) next.pp = cfg.default;
            break;
          case 'back':
            if (cfg.default) next.back = cfg.default;
            break;
          case 'spring_color':
            if (cfg.default) next.springColor = cfg.default;
            break;
          case 'spring_options':
            // spring_options의 각 하위 옵션 기본값 적용
            const ppDefault = cfg.pp?.options?.find(o => o.default)?.id;
            if (ppDefault) next.pp = ppDefault;
            const coverPrintDefault = cfg.coverPrint?.options?.find(o => o.default)?.id;
            if (coverPrintDefault) next.coverPrint = coverPrintDefault;
            const backDefault = cfg.back?.options?.find(o => o.default)?.id;
            if (backDefault) next.back = backDefault;
            const springColorDefault = cfg.springColor?.options?.find(o => o.default)?.id;
            if (springColorDefault) next.springColor = springColorDefault;
            break;
        }
        return next;
      });
    }

    setCurrentProduct(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === id ? { ...b, label: newLabel, desc: newDesc } : b)
    }));
    setSelectedBlockId(null);
  };

  // 블록 속성 업데이트 (optional, locked, hidden)
  const updateBlockProp = (blockId, prop, value) => {
    setCurrentProduct(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === blockId ? { ...b, [prop]: value } : b)
    }));
  };

  // config 업데이트
  const updateCfg = (blockId, key, value) => {
    setCurrentProduct(prev => ({
      ...prev,
      blocks: prev.blocks.map(b =>
        b.id === blockId ? { ...b, config: { ...b.config, [key]: value } } : b
      )
    }));
  };

  // 사이즈 옵션 토글
  const toggleSizeOption = (blockId, sizeCode, checked) => {
    setCurrentProduct(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => {
        if (b.id !== blockId) return b;
        let options = b.config.options || [];
        if (checked) {
          if (!options.includes(sizeCode)) options = [...options, sizeCode];
        } else {
          options = options.filter(s => s !== sizeCode);
        }
        return { ...b, config: { ...b.config, options } };
      })
    }));
  };

  // 용지 토글
  const togglePaper = (blockId, paperCode, checked) => {
    setCurrentProduct(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => {
        if (b.id !== blockId) return b;
        let papers = { ...b.config.papers };
        if (checked) {
          papers[paperCode] = DB.weights[paperCode].slice(0, 3);
        } else {
          delete papers[paperCode];
        }
        return { ...b, config: { ...b.config, papers } };
      })
    }));
  };

  // 평량 토글
  const toggleWeight = (blockId, paperCode, weight, checked) => {
    setCurrentProduct(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => {
        if (b.id !== blockId) return b;
        let papers = { ...b.config.papers };
        let ws = papers[paperCode] || [];
        if (checked) {
          if (!ws.includes(weight)) ws = [...ws, weight].sort((a, b) => a - b);
        } else {
          ws = ws.filter(w => w !== weight);
        }
        papers[paperCode] = ws;
        return { ...b, config: { ...b.config, papers } };
      })
    }));
  };

  // 배열 옵션 토글
  const toggleArrayOption = (blockId, option, checked) => {
    setCurrentProduct(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => {
        if (b.id !== blockId) return b;
        let options = b.config.options || [];
        if (checked) {
          if (!options.includes(option)) options = [...options, option];
        } else {
          options = options.filter(o => o !== option);
        }
        return { ...b, config: { ...b.config, options } };
      })
    }));
  };

  // 수량 추가/삭제
  const addQty = (blockId, qty) => {
    if (!qty || qty <= 0) return;
    setCurrentProduct(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => {
        if (b.id !== blockId) return b;
        let options = b.config.options || [];
        if (!options.includes(qty)) {
          options = [...options, qty].sort((a, b) => a - b);
        }
        return { ...b, config: { ...b.config, options } };
      })
    }));
  };

  const removeQty = (blockId, qty) => {
    setCurrentProduct(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => {
        if (b.id !== blockId) return b;
        return { ...b, config: { ...b.config, options: b.config.options.filter(q => q !== qty) } };
      })
    }));
  };

  // 상품보관소에 저장 (템플릿 업데이트 + 저장 완료 알림)
  const saveToStorage = () => {
    setTemplates(prev => prev.map(t =>
      t.id === currentTemplateId ? { ...currentProduct } : t
    ));

    // Supabase 저장
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: currentProduct.id,
        name: currentProduct.name,
        description: currentProduct.content?.description || '',
        main_image: currentProduct.content?.mainImage || null,
        icon: currentProduct.icon || '📄',
        sort_order: currentProduct.order ?? 0,
        content: currentProduct.content || {},
        blocks: currentProduct.blocks || [],
        product_type: currentProduct.productType || null,
        is_published: true
      })
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        alert(`"${currentProduct.name}" 저장 완료!`);
      })
      .catch(err => {
        console.error('Supabase 저장 실패:', err);
        alert('저장에 실패했습니다. 다시 시도해주세요.');
      });
  };

  // JSON 파일로 내보내기 (백업용)
  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(currentProduct, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${currentProduct.name}_config.json`;
    a.click();
  };

  // ON 블록 수
  const onCount = currentProduct?.blocks?.filter(b => b.on).length || 0;

  // 가격 계산 (productType으로 제본 상품 분기) - DB 로드 완료 후에만
  const price = dbLoaded ? (calculatePrice(customer, customer.qty, currentTemplateId) || { total: 0, unitPrice: 0, sheets: 0, faces: 0 }) : { total: 0, unitPrice: 0, sheets: 0, faces: 0 };

  // 콘텐츠
  const content = currentProduct?.content || getDefaultContent(currentProduct?.name || '');

  if (!currentProduct || !dbLoaded) {
    return <div className="p-8 text-center">데이터를 불러오는 중...</div>;
  }

  return (
    <div className="bg-white min-h-screen">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">상품 빌더</h1>
          <div className="flex items-center gap-3">
            <button onClick={exportConfig} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              JSON
            </button>
            <button onClick={updateCurrentTemplate} className="px-4 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors">
              적용
            </button>
            <button onClick={saveToStorage} className="px-4 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-md transition-colors">
              저장
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* 템플릿 선택 */}
        <div className="card bg-white shadow-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500">템플릿 (드래그하여 순서 변경)</span>
          </div>
          <div ref={templateListRef} className="flex gap-2 flex-wrap">
            {templates.sort((a, b) => a.order - b.order).map((template) => (
              <div
                key={template.id}
                className={`group relative inline-flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-md cursor-pointer transition-all border ${
                  currentTemplateId === template.id
                    ? 'bg-gray-100 border-gray-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => selectTemplate(template.id)}
              >
                <span
                  className="text-sm cursor-pointer opacity-60"
                  onClick={(e) => { e.stopPropagation(); changeTemplateIcon(template.id); }}
                  title="클릭하여 아이콘 변경"
                >
                  {template.icon}
                </span>

                {editingTemplateId === template.id ? (
                  <input
                    type="text"
                    value={editingTemplateName}
                    onChange={(e) => setEditingTemplateName(e.target.value)}
                    onBlur={finishEditTemplateName}
                    onKeyDown={(e) => e.key === 'Enter' && finishEditTemplateName()}
                    className="input input-bordered input-xs w-24 h-6"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="text-sm text-gray-700"
                    onDoubleClick={(e) => { e.stopPropagation(); startEditTemplateName(template.id, template.name); }}
                    title="더블클릭하여 이름 수정"
                  >
                    {template.name}
                  </span>
                )}

                <button
                  className="w-4 h-4 flex items-center justify-center rounded text-xs opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); deleteTemplate(template.id); }}
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-400 hover:text-gray-700 transition-all"
              onClick={() => {
                const newId = `template_${Date.now()}`;
                const newTemplate = {
                  id: newId,
                  order: templates.length,
                  icon: '📄',
                  name: '새 상품',
                  blocks: [],
                  content: getDefaultContent('새 상품')
                };
                setTemplates(prev => [...prev, newTemplate]);
                setCurrentTemplateId(newId);
                setCurrentProduct(newTemplate);
                // URL 업데이트로 새 상품 ID 보존
                history.replaceState(null, '', `?id=${newId}`);
              }}
            >
              <span className="text-sm">+</span>
              <span className="text-sm">추가</span>
            </button>
          </div>
        </div>

        {/* 연동 에러 표시 */}
        {linkStatus.error && (
          <div className="alert alert-error mb-6">
            <span>⚠️ {linkStatus.error}</span>
          </div>
        )}

        {/* 고객 화면 미리보기 */}
        <div className="card bg-white shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">👁️</span>
              <div>
                <h2 className="font-bold text-gray-900">고객 화면 미리보기</h2>
                <p className="text-xs text-gray-500">블록 순서대로 자동 렌더링 + 실시간 가격 계산</p>
              </div>
            </div>
            <span className="text-sm text-gray-400">블록 {onCount}개</span>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* 왼쪽: 이미지 영역 */}
            <div>
              {/* 메인 이미지 */}
              <input
                ref={mainImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleMainImageUpload}
              />
              <div
                className={`aspect-square bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors mb-4 overflow-hidden ${imageUploading ? 'opacity-50' : ''}`}
                onClick={() => mainImageRef.current?.click()}
              >
                {content.mainImage ? (
                  <img src={content.mainImage} alt="메인" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <div className="text-4xl text-gray-300 mb-2">+</div>
                    <p className="text-sm text-gray-400">{imageUploading ? '업로드 중...' : '메인 이미지'}</p>
                  </>
                )}
              </div>

              {/* 썸네일 4개 */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[0, 1, 2, 3].map(idx => (
                  <div key={idx}>
                    <input
                      ref={thumbImageRefs[idx]}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleThumbnailUpload(e, idx)}
                    />
                    <div
                      className={`aspect-square bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors overflow-hidden ${imageUploading ? 'opacity-50' : ''}`}
                      onClick={() => thumbImageRefs[idx].current?.click()}
                    >
                      {content.thumbnails?.[idx] ? (
                        <img src={content.thumbnails[idx]} alt={`썸네일${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl text-gray-300">+</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 하이라이트 카드 */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 mt-5 pt-5 border-t border-gray-100">
                {content.highlights?.map((h, idx) => {
                  const IconComp = getIconComponent(h.icon);
                  const updateHighlight = (field, value) => {
                    const newHighlights = [...content.highlights];
                    newHighlights[idx] = { ...h, [field]: value };
                    setCurrentProduct(prev => ({
                      ...prev,
                      content: { ...prev.content, highlights: newHighlights }
                    }));
                  };
                  return (
                    <div key={idx} className="flex items-start gap-3">
                      {/* 아이콘 선택 */}
                      <div className="relative group flex-shrink-0 pt-0.5">
                        <button
                          type="button"
                          className="flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                          onClick={(e) => {
                            const dropdown = e.currentTarget.nextElementSibling;
                            dropdown.classList.toggle('hidden');
                          }}
                        >
                          <IconComp size={32} strokeWidth={1.3} className="text-[#222828]" />
                        </button>
                        <div className="hidden absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-5 gap-1 w-[200px]">
                          {ICON_LIST.map(({ id, label, Component }) => (
                            <button
                              key={id}
                              type="button"
                              title={label}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${h.icon === id ? 'bg-[#222828] text-white' : 'hover:bg-gray-100 text-[#222828]'}`}
                              onClick={(e) => {
                                updateHighlight('icon', id);
                                e.currentTarget.parentElement.classList.add('hidden');
                              }}
                            >
                              <Component size={16} strokeWidth={1.5} />
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* 텍스트 */}
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={h.title || ''}
                          onChange={(e) => updateHighlight('title', e.target.value)}
                          className="block w-full text-[15px] font-semibold text-[#222828] bg-transparent border-b border-transparent hover:border-gray-200 focus:border-[#222828] outline-none leading-snug mb-0.5"
                          placeholder="제목"
                        />
                        <input
                          type="text"
                          value={h.desc || ''}
                          onChange={(e) => updateHighlight('desc', e.target.value)}
                          className="block w-full text-[13px] text-[#6b7280] bg-transparent border-b border-transparent hover:border-gray-200 focus:border-[#222828] outline-none leading-relaxed"
                          placeholder="설명"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* 오른쪽: 옵션 영역 */}
            <div>
              {/* 제목 */}
              <input
                type="text"
                value={content.title}
                onChange={(e) => setCurrentProduct(prev => ({
                  ...prev,
                  content: { ...prev.content, title: e.target.value }
                }))}
                className="text-2xl font-bold mb-2 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-primary outline-none w-full"
                placeholder="상품명"
              />

              {/* 설명 */}
              <input
                type="text"
                value={content.description}
                onChange={(e) => setCurrentProduct(prev => ({
                  ...prev,
                  content: { ...prev.content, description: e.target.value }
                }))}
                className="text-gray-600 mb-4 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary outline-none w-full"
                placeholder="상품 설명"
              />

              {/* 주요 특징 - 노션 스타일 에디터 */}
              <div className="mb-4">
                <p className="font-medium text-sm mb-2">주요 특징</p>
                <BlockNoteEditor
                  initialContent={content.featuresHtml || (content.features?.map(f => `- ${f}`).join('\n') || '')}
                  onChange={(html) => setCurrentProduct(prev => ({
                    ...prev,
                    content: { ...prev.content, featuresHtml: html }
                  }))}
                />
              </div>

              {/* 블록 미리보기 */}
              {currentProduct.blocks
                .filter(b => b.on && !b.hidden)
                .map(block => (
                  <PreviewBlock
                    key={block.id}
                    block={block}
                    customer={customer}
                    setCustomer={setCustomer}
                    calculatePrice={calculatePrice}
                    linkStatus={linkStatus}
                    handleFoldSelect={handleFoldSelect}
                    productType={currentTemplateId}
                    dbPapers={dbPapers}
                    dbPapersList={dbPapersList}
                    allBlocks={currentProduct.blocks}
                  />
                ))}

              {/* 가격 표시 */}
              <div className="border border-gray-200 rounded-lg p-4 mt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">{currentProduct.name}</p>
                    <p className="text-xs text-gray-400">{customer.qty}부 · {customer.pages || '-'}장</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-gray-900 tracking-tight">{price.total.toLocaleString()}<span className="text-sm font-normal text-gray-400 ml-0.5">원</span></p>
                    <p className="text-xs text-gray-400">부가세 별도</p>
                  </div>
                </div>

                {/* 두께 경고/에러 표시 */}
                {price.thicknessValidation?.error && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <span>⚠️</span> {price.thicknessValidation.message}
                    </p>
                  </div>
                )}
                {price.thicknessValidation?.warning && !price.thicknessValidation?.error && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-700 flex items-center gap-1">
                      <span>⚠️</span> {price.thicknessValidation.message}
                    </p>
                  </div>
                )}

                {/* 두께 정보 표시 (제본 상품일 때) */}
                {price.totalThickness > 0 && (
                  <p className="text-xs text-gray-400 mt-2 text-right">
                    예상 두께: {price.totalThickness.toFixed(1)}mm
                  </p>
                )}
              </div>

              {/* 주문하기 버튼 */}
              <button
                disabled={price.thicknessValidation?.error}
                className={`w-full mt-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  price.thicknessValidation?.error
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                }`}
              >
                {price.thicknessValidation?.error ? '주문 불가 (두께 초과)' : '주문하기'}
              </button>
            </div>
          </div>
        </div>

        {/* 블록 빌더 */}
        <div className="card bg-white shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧱</span>
              <div>
                <h2 className="font-bold text-gray-900">블록 빌더</h2>
                <p className="text-xs text-gray-500">드래그하여 순서 변경 · 체크박스로 ON/OFF · 톱니바퀴로 설정</p>
              </div>
            </div>
            <button
              onClick={() => setShowBlockLibrary(true)}
              className="btn btn-success btn-sm"
            >
              + 블록 추가
            </button>
          </div>

          <div ref={blockListRef} className="space-y-2">
            {currentProduct.blocks.map(block => (
              <BlockItem
                key={block.id}
                block={block}
                isEditing={selectedBlockId === block.id}
                toggleBlock={toggleBlock}
                toggleEdit={toggleEdit}
                removeBlock={removeBlock}
                labelInput={labelInput}
                setLabelInput={setLabelInput}
                descInput={descInput}
                setDescInput={setDescInput}
                applySettings={applySettings}
                updateBlockProp={updateBlockProp}
                updateCfg={updateCfg}
                toggleSizeOption={toggleSizeOption}
                togglePaper={togglePaper}
                toggleWeight={toggleWeight}
                toggleArrayOption={toggleArrayOption}
                addQty={addQty}
                removeQty={removeQty}
                newQtyInput={newQtyInput}
                setNewQtyInput={setNewQtyInput}
                allBlocks={currentProduct.blocks}
                dbPapersList={dbPapersList}
                BlockSettingsComponent={BlockSettings}
              />
            ))}
          </div>
        </div>

        {/* 블록 라이브러리 모달 */}
        {showBlockLibrary && (
          <div className="modal modal-open" onClick={() => setShowBlockLibrary(false)}>
            <div className="modal-box w-[600px] max-w-5xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">블록 라이브러리</h3>
                <button onClick={() => setShowBlockLibrary(false)} className="btn btn-ghost btn-sm btn-circle">✕</button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(BLOCK_TYPES).map(([type, info]) => (
                  <button
                    key={type}
                    onClick={() => addBlock(type)}
                    className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 transition-all text-left"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${info.color} flex items-center justify-center text-xl mb-2`}>
                      {info.icon}
                    </div>
                    <p className="font-medium text-sm text-gray-700">{info.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{info.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
