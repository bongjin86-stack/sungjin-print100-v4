// ============================================================
// AdminBuilder.jsx - 블록 시스템 업그레이드 v2
// - 스프링제본: PP + 표지인쇄 분리 + 연동
// - 내지 레이어 블록 (중철/낱장)
// - 블록 설정: 선택/필수, 고정, 숨김, 기본값
// ============================================================

import { useState, useEffect, useRef } from 'react';
import Sortable from 'sortablejs';
import { BLOCK_TYPES, TEMPLATES as DEFAULT_TEMPLATES, DB, getDefaultCustomer, LINK_RULES } from '@/lib/builderData';
import { calculatePrice, validateCoatingWeight } from '@/lib/priceEngine';
import { loadPricingData } from '@/lib/dbService';
import { uploadImage } from '@/lib/supabase';
import { getBusinessDate, formatBusinessDate } from '@/lib/businessDays';
import BlockNoteEditor from '@/components/admin/BlockNoteEditor';
import { ICON_LIST, getIconComponent } from '@/lib/highlightIcons';


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

  // URL 파라미터 변경 시 해당 상품 로드
  useEffect(() => {
    if (urlProductId && urlProductId !== currentTemplateId) {
      const found = templates.find(t => t.id === urlProductId);
      if (found) {
        setCurrentTemplateId(urlProductId);
        setCurrentProduct({ ...found, blocks: found.blocks.map(b => ({ ...b, config: { ...b.config } })) });
        // 블록 기본값 적용
        setCustomer(extractDefaultsFromBlocks(found.blocks));
      }
    }
  }, [urlProductId]);

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
    }).catch(err => console.error('Supabase 저장 실패:', err));

    alert('변경사항이 적용되었습니다.');
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
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
        return { min: 8, max: 48, step: 4, default: 16 };
      case 'pages_leaf':
        return { min: 10, max: 500, step: 2, default: 50 };
      case 'pages':
        return { 
          min: 8, max: 48, step: 4, default: 16,
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
    }).catch(err => console.error('Supabase 저장 실패:', err));

    alert(`"${currentProduct.name}" 저장 완료!`);
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
                                e.currentTarget.closest('.grid').parentElement.classList.add('hidden');
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

// ============================================================
// 블록 아이템 컴포넌트
// ============================================================
function BlockItem({
  block, isEditing, toggleBlock, toggleEdit, removeBlock,
  labelInput, setLabelInput, descInput, setDescInput, applySettings, updateBlockProp,
  updateCfg, toggleSizeOption, togglePaper, toggleWeight,
  toggleArrayOption, addQty, removeQty, newQtyInput, setNewQtyInput, allBlocks, dbPapersList = []
}) {
  const blockType = BLOCK_TYPES[block.type] || { name: block.type, icon: '📦', color: 'from-stone-100 to-stone-200' };

  return (
    <div
      data-block-id={block.id}
      className={`rounded-lg border transition-all ${isEditing ? 'border-gray-300 bg-gray-50/30' : 'border-gray-200'} ${!block.on ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center gap-3 p-3">
        <div className="drag-handle cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 text-base select-none px-1 -ml-1 transition-colors">⋮⋮</div>

        <input
          type="checkbox"
          checked={block.on}
          onChange={() => toggleBlock(block.id)}
          className="checkbox checkbox-sm checkbox-neutral"
        />

        <div className={`w-9 h-9 rounded-md bg-gradient-to-br ${blockType.color} flex items-center justify-center text-lg`}>
          {blockType.icon}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{block.label}</p>
            {block.optional && <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-50 rounded">선택</span>}
            {block.locked && <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-50 rounded">고정</span>}
            {block.hidden && <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-50 rounded">숨김</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {block.desc || getBlockSummary(block, dbPapersList)}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${isEditing ? 'bg-neutral text-neutral-content' : 'hover:bg-gray-50 text-gray-400'}`}
            onClick={() => toggleEdit(block.id)}
            title="설정"
          >
            ⚙
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded text-sm hover:bg-error/10 hover:text-error text-gray-400 transition-colors"
            onClick={() => removeBlock(block.id)}
            title="삭제"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 설정 패널 */}
      {isEditing && (
        <div className="border-t-2 border-primary/30 bg-gray-50 rounded-b-xl p-4">
          {/* 라벨명 */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-1">라벨명</label>
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              className="input input-bordered input-sm w-full"
            />
          </div>

          {/* 설명 */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-1">설명 (라벨 아래 표시)</label>
            <input
              type="text"
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              placeholder="예: 사이즈를 선택해주세요"
              className="input input-bordered input-sm w-full"
            />
          </div>

          {/* 블록 속성: 선택/필수, 고정, 숨김 */}
          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-2 font-medium">블록 속성</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={block.optional}
                  onChange={(e) => updateBlockProp(block.id, 'optional', e.target.checked)}
                  className="checkbox checkbox-sm"
                />
                <span>선택</span>
                <span className="text-xs text-gray-400">(체크 안 하면 필수)</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={block.locked}
                  onChange={(e) => updateBlockProp(block.id, 'locked', e.target.checked)}
                  className="checkbox checkbox-sm"
                />
                <span>고정</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={block.hidden}
                  onChange={(e) => updateBlockProp(block.id, 'hidden', e.target.checked)}
                  className="checkbox checkbox-sm"
                />
                <span>숨김</span>
              </label>
            </div>
          </div>
          
          {/* 블록별 상세 설정 */}
          <BlockSettings
            block={block}
            updateCfg={updateCfg}
            updateBlockProp={updateBlockProp}
            toggleSizeOption={toggleSizeOption}
            togglePaper={togglePaper}
            toggleWeight={toggleWeight}
            toggleArrayOption={toggleArrayOption}
            addQty={addQty}
            removeQty={removeQty}
            newQtyInput={newQtyInput}
            setNewQtyInput={setNewQtyInput}
            allBlocks={allBlocks}
            dbPapersList={dbPapersList}
          />
          
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => toggleEdit(null)}
              className="btn btn-ghost btn-sm"
            >
              취소
            </button>
            <button
              onClick={() => applySettings(block.id, labelInput, descInput)}
              className="btn btn-primary btn-sm"
            >
              ✓ 적용
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 블록 요약 텍스트
function getBlockSummary(block, dbPapersList = []) {
  const cfg = block.config;
  // DB에서 정렬된 용지 목록 사용 (없으면 하드코딩된 목록 폴백)
  const papersList = dbPapersList?.length > 0 ? dbPapersList : DB.papers;
  switch (block.type) {
    case 'size':
      return cfg.options?.map(s => DB.sizeMultipliers[s]?.name || s.toUpperCase()).join(', ') || '-';
    case 'paper':
      return Object.keys(cfg.papers || {}).map(p => papersList.find(pp => pp.code === p)?.name).filter(Boolean).join(', ') || '-';
    case 'print':
      const colors = [cfg.color && '컬러', cfg.mono && '흑백'].filter(Boolean).join('/');
      const sides = [cfg.single && '단면', cfg.double && '양면'].filter(Boolean).join('/');
      return `${colors}, ${sides}`;

    case 'pp':
      return cfg.options?.map(o => o === 'clear' ? '투명' : o === 'frosted' ? '불투명' : '없음').join(', ') || '-';
    case 'cover_print':
      return cfg.options?.map(o => o === 'none' ? '없음' : o === 'front_only' ? '앞표지만' : '앞뒤표지').join(', ') || '-';
    case 'back':
      return cfg.options?.map(o => o === 'white' ? '화이트' : o === 'black' ? '블랙' : '없음').join(', ') || '-';
    case 'spring_color':
      return cfg.options?.map(o => o === 'black' ? '블랙' : '화이트').join(', ') || '-';
    case 'spring_options':
      const ppOpts = cfg.pp?.options?.filter(o => o.enabled).map(o => o.label).join('/') || '';
      const cpOpts = cfg.coverPrint?.options?.filter(o => o.enabled).map(o => o.label).join('/') || '';
      return `PP:${ppOpts}, 표지:${cpOpts}`;
    case 'delivery':
      // 배열 구조 지원 + 기존 개별 키 구조 호환
      if (cfg.options?.length > 0) {
        return cfg.options.filter(opt => opt.enabled).map(opt => opt.label).join(', ') || '-';
      }
      return [cfg.same && '당일', cfg.next1 && '1영업일', cfg.next2 && '2영업일', cfg.next3 && '3영업일'].filter(Boolean).join(', ') || '-';
    case 'quantity':
      return cfg.options?.map(q => `${q}부`).join(', ') || '-';
    case 'pages_saddle':
    case 'pages_leaf':
    case 'pages':
      return `${cfg.min}~${cfg.max}p (${cfg.step}p 단위)`;
    case 'inner_layer_saddle':
    case 'inner_layer_leaf':
      return `내지 용지+인쇄+페이지 통합`;
    default:
      return '-';
  }
}

// ============================================================
// 블록별 설정 패널
// ============================================================
function BlockSettings({
  block, updateCfg, updateBlockProp, toggleSizeOption, togglePaper, toggleWeight,
  toggleArrayOption, addQty, removeQty, newQtyInput, setNewQtyInput, allBlocks, dbPapersList
}) {
  // DB에서 정렬된 용지 목록 사용 (없으면 하드코딩된 목록 폴백)
  const papersList = dbPapersList?.length > 0 ? dbPapersList : DB.papers;
  const cfg = block.config;
  
  switch (block.type) {
    case 'size':
      return (
        <div>
          <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg mb-3">
            더블클릭으로 기본값 설정 (★ 표시)
          </p>
          <label className="text-xs text-gray-500 block mb-2">사이즈 옵션</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(DB.sizeMultipliers).map(([code, info]) => (
              <label
                key={code}
                className="flex items-center gap-1 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', code)}
              >
                <input
                  type="checkbox"
                  checked={cfg.options?.includes(code)}
                  onChange={(e) => toggleSizeOption(block.id, code, e.target.checked)}
                  className="checkbox checkbox-sm"
                />
                {info.name}
                {cfg.default === code && <span className="text-warning ml-1">★</span>}
              </label>
            ))}
          </div>
        </div>
      );
      
    case 'paper':
      return (
        <div>
          <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg mb-3">
            더블클릭으로 기본값 설정 (★ 표시)
          </p>
          <label className="text-xs text-gray-500 block mb-2">용지 선택</label>
          {papersList.map(paper => {
            const isOn = cfg.papers && cfg.papers[paper.code];
            const isDefaultPaper = cfg.default?.paper === paper.code;
            return (
              <div key={paper.code} className="mb-2 p-3 bg-white rounded-lg border border-gray-200">
                <label
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                  onDoubleClick={() => {
                    // 이미 기본값이면 해제, 아니면 설정
                    if (isDefaultPaper) {
                      updateCfg(block.id, 'default', { ...cfg.default, paper: null });
                    } else {
                      updateCfg(block.id, 'default', { ...cfg.default, paper: paper.code });
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!isOn}
                    onChange={(e) => togglePaper(block.id, paper.code, e.target.checked)}
                    className="checkbox checkbox-sm"
                  />
                  {paper.name}
                  {isDefaultPaper && <span className="text-warning">★</span>}
                </label>
                {isOn && (
                  <div className="flex flex-wrap gap-2 mt-2 ml-6">
                    {DB.weights[paper.code]?.map(w => (
                      <label
                        key={w}
                        className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded cursor-pointer"
                        onDoubleClick={() => {
                          // 이미 기본값이면 해제, 아니면 설정
                          if (cfg.default?.weight === w && isDefaultPaper) {
                            updateCfg(block.id, 'default', { ...cfg.default, weight: null });
                          } else {
                            updateCfg(block.id, 'default', { ...cfg.default, weight: w });
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={cfg.papers[paper.code]?.includes(w)}
                          onChange={(e) => toggleWeight(block.id, paper.code, w, e.target.checked)}
                          className="checkbox checkbox-xs"
                        />
                        {w}g
                        {cfg.default?.weight === w && isDefaultPaper && <span className="text-warning ml-1">★</span>}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
      
    case 'pp':
      return (
        <div>
          <label className="text-xs text-gray-500 block mb-2">PP 옵션</label>
          <div className="flex flex-wrap gap-3">
            {[{code:'clear',name:'투명'},{code:'frosted',name:'불투명'},{code:'none',name:'없음'}].map(opt => (
              <label key={opt.code} className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={cfg.options?.includes(opt.code)}
                  onChange={(e) => toggleArrayOption(block.id, opt.code, e.target.checked)}
                  className="checkbox checkbox-sm"
                />
                {opt.name}
              </label>
            ))}
          </div>
          <div className="mt-3">
            <label className="text-xs text-gray-500 block mb-1">기본값</label>
            <select
              value={cfg.default || ''}
              onChange={(e) => updateCfg(block.id, 'default', e.target.value)}
              className="select select-bordered select-sm"
            >
              {cfg.options?.map(o => (
                <option key={o} value={o}>{o === 'clear' ? '투명' : o === 'frosted' ? '불투명' : '없음'}</option>
              ))}
            </select>
          </div>
        </div>
      );
      
    case 'cover_print':
      return (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-2">표지인쇄 옵션</label>
            <div className="flex flex-wrap gap-3">
              {[{code:'none',name:'없음 (내지가 첫페이지)'},{code:'front_only',name:'앞표지만 인쇄'},{code:'front_back',name:'앞뒤표지 인쇄'}].map(opt => (
                <label key={opt.code} className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input 
                    type="checkbox" 
                    checked={cfg.options?.includes(opt.code)}
                    onChange={(e) => toggleArrayOption(block.id, opt.code, e.target.checked)}
                  />
                  {opt.name}
                </label>
              ))}
            </div>
          </div>
          
          <div className="alert alert-warning">
            <p className="text-xs font-medium mb-2">⚠️ 연동 규칙</p>
            <p className="text-xs">• "앞뒤표지 인쇄" 선택 시 → 뒷판 블록 비활성화</p>
            <p className="text-xs">• PP=없음 AND 표지인쇄=없음 → 불가 (에러)</p>
          </div>
          
          <div>
            <label className="text-xs text-gray-500 block mb-2">표지 용지 (표지인쇄 선택 시 표시)</label>
            {papersList.map(paper => {
              const isOn = cfg.papers && cfg.papers[paper.code];
              return (
                <div key={paper.code} className="mb-2 p-2 bg-white rounded-lg border border-gray-200">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!isOn}
                      onChange={(e) => {
                        let papersObj = { ...cfg.papers };
                        if (e.target.checked) {
                          papersObj[paper.code] = DB.weights[paper.code].filter(w => w >= 150).slice(0, 3);
                        } else {
                          delete papersObj[paper.code];
                        }
                        updateCfg(block.id, 'papers', papersObj);
                      }}
                    />
                    {paper.name}
                  </label>
                  {isOn && (
                    <div className="flex flex-wrap gap-2 mt-2 ml-6">
                      {DB.weights[paper.code]?.filter(w => w >= 150).map(w => (
                        <label key={w} className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={cfg.papers[paper.code]?.includes(w)}
                            onChange={(e) => {
                              let papers = { ...cfg.papers };
                              let ws = papers[paper.code] || [];
                              if (e.target.checked) {
                                if (!ws.includes(w)) ws = [...ws, w].sort((a,b) => a-b);
                              } else {
                                ws = ws.filter(ww => ww !== w);
                              }
                              papers[paper.code] = ws;
                              updateCfg(block.id, 'papers', papers);
                            }}
                          />
                          {w}g
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
      
    case 'print':
      return (
        <div className="space-y-4">
          <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg">
            더블클릭으로 기본값 설정 (★ 표시)
          </p>
          <div>
            <label className="text-xs text-gray-500 block mb-2">컬러</label>
            <div className="flex gap-3">
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, color: 'color' })}
              >
                <input type="checkbox" checked={cfg.color} onChange={(e) => updateCfg(block.id, 'color', e.target.checked)} />
                컬러
                {cfg.default?.color === 'color' && <span className="text-warning">★</span>}
              </label>
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, color: 'mono' })}
              >
                <input type="checkbox" checked={cfg.mono} onChange={(e) => updateCfg(block.id, 'mono', e.target.checked)} />
                흑백
                {cfg.default?.color === 'mono' && <span className="text-warning">★</span>}
              </label>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">면수</label>
            <div className="flex gap-3">
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, side: 'single' })}
              >
                <input type="checkbox" checked={cfg.single} onChange={(e) => updateCfg(block.id, 'single', e.target.checked)} />
                단면
                {cfg.default?.side === 'single' && <span className="text-warning">★</span>}
              </label>
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, side: 'double' })}
              >
                <input type="checkbox" checked={cfg.double} onChange={(e) => updateCfg(block.id, 'double', e.target.checked)} />
                양면
                {cfg.default?.side === 'double' && <span className="text-warning">★</span>}
              </label>
            </div>
          </div>
        </div>
      );
      

    case 'finishing':
      return (
        <div className="space-y-4">
          <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg mb-1">
            더블클릭으로 기본값 설정 (★ 표시)
          </p>
          <div>
            <label className="text-xs text-gray-500 block mb-2">기본 후가공</label>
            <div className="flex gap-3 flex-wrap">
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, coating: !cfg.default?.coating })}
              >
                <input type="checkbox" checked={cfg.coating?.enabled ?? false} onChange={(e) => updateCfg(block.id, 'coating', { ...cfg.coating, enabled: e.target.checked, matte: true, gloss: true, single: true, double: true })} />
                코팅 {cfg.default?.coating && '★'}
              </label>
              {cfg.coating?.enabled && (
                <div className="flex gap-2 ml-2 items-center flex-wrap">
                  <label
                    className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, coating: true, coatingType: cfg.default?.coatingType === 'matte' ? null : 'matte' })}
                  >
                    <input type="checkbox" checked={cfg.coating?.matte ?? true} onChange={(e) => updateCfg(block.id, 'coating', { ...cfg.coating, matte: e.target.checked })} />
                    무광 {cfg.default?.coatingType === 'matte' && '★'}
                  </label>
                  <label
                    className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, coating: true, coatingType: cfg.default?.coatingType === 'gloss' ? null : 'gloss' })}
                  >
                    <input type="checkbox" checked={cfg.coating?.gloss ?? true} onChange={(e) => updateCfg(block.id, 'coating', { ...cfg.coating, gloss: e.target.checked })} />
                    유광 {cfg.default?.coatingType === 'gloss' && '★'}
                  </label>
                  <label
                    className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, coating: true, coatingSide: cfg.default?.coatingSide === 'single' ? null : 'single' })}
                  >
                    <input type="checkbox" checked={cfg.coating?.single ?? true} onChange={(e) => updateCfg(block.id, 'coating', { ...cfg.coating, single: e.target.checked })} />
                    단면 {cfg.default?.coatingSide === 'single' && '★'}
                  </label>
                  <label
                    className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, coating: true, coatingSide: cfg.default?.coatingSide === 'double' ? null : 'double' })}
                  >
                    <input type="checkbox" checked={cfg.coating?.double ?? true} onChange={(e) => updateCfg(block.id, 'coating', { ...cfg.coating, double: e.target.checked })} />
                    양면 {cfg.default?.coatingSide === 'double' && '★'}
                  </label>
                  <span className="text-xs text-gray-400 ml-2">평량기준:</span>
                  <select
                    value={cfg.coating?.linkedPaper || ''}
                    onChange={(e) => updateCfg(block.id, 'coating', { ...cfg.coating, linkedPaper: e.target.value || null })}
                    className="text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                  >
                    <option value="">자동</option>
                    {allBlocks?.filter(b => ['paper', 'cover_print', 'inner_layer_saddle', 'inner_layer_leaf'].includes(b.type) && b.on).map(b => (
                      <option key={b.id} value={b.id}>{b.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, corner: !cfg.default?.corner })}
              >
                <input type="checkbox" checked={cfg.corner} onChange={(e) => updateCfg(block.id, 'corner', e.target.checked)} />
                귀도리 {cfg.default?.corner && '★'}
              </label>
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, punch: !cfg.default?.punch })}
              >
                <input type="checkbox" checked={cfg.punch} onChange={(e) => updateCfg(block.id, 'punch', e.target.checked)} />
                타공 {cfg.default?.punch && '★'}
              </label>
              <label
                className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => updateCfg(block.id, 'default', { ...cfg.default, mising: !cfg.default?.mising })}
              >
                <input type="checkbox" checked={cfg.mising} onChange={(e) => updateCfg(block.id, 'mising', e.target.checked)} />
                미싱 {cfg.default?.mising && '★'}
              </label>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">오시 (접는 선)</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={cfg.osi?.enabled ?? false} onChange={(e) => updateCfg(block.id, 'osi', { ...cfg.osi, enabled: e.target.checked })} />
                오시 사용
              </label>
              {cfg.osi?.enabled && (
                <div className="flex gap-2">
                  {[1, 2, 3].map(n => (
                    <label key={n} className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={cfg.osi?.options?.includes(n) ?? false} onChange={(e) => {
                        const opts = cfg.osi?.options || [];
                        updateCfg(block.id, 'osi', { ...cfg.osi, options: e.target.checked ? [...opts, n] : opts.filter(x => x !== n) });
                      }} />
                      {n}줄
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">접지 (접는 회수)</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={cfg.fold?.enabled ?? false} onChange={(e) => updateCfg(block.id, 'fold', { ...cfg.fold, enabled: e.target.checked })} />
                접지 사용
              </label>
              {cfg.fold?.enabled && (
                <div className="flex gap-2">
                  {[2, 3, 4].map(n => (
                    <label key={n} className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={cfg.fold?.options?.includes(n) ?? false} onChange={(e) => {
                        const opts = cfg.fold?.options || [];
                        updateCfg(block.id, 'fold', { ...cfg.fold, options: e.target.checked ? [...opts, n] : opts.filter(x => x !== n) });
                      }} />
                      {n}단
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">* 130g 이상 용지에서 접지 선택 시 오시 자동 활성화 (2단→1줄, 3단→2줄, 4단→3줄)</p>
          </div>
        </div>
      );
      
    case 'back':
      return (
        <div>
          <label className="text-xs text-gray-500 block mb-2">뒷판 옵션</label>
          <div className="flex gap-3">
            {[{code:'white',name:'화이트'},{code:'black',name:'블랙'},{code:'none',name:'없음'}].map(opt => (
              <label key={opt.code} className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input 
                  type="checkbox" 
                  checked={cfg.options?.includes(opt.code)}
                  onChange={(e) => toggleArrayOption(block.id, opt.code, e.target.checked)}
                />
                {opt.name}
              </label>
            ))}
          </div>
        </div>
      );
      
    case 'spring_color':
      return (
        <div>
          <label className="text-xs text-gray-500 block mb-2">스프링 색상</label>
          <div className="flex gap-3">
            {[{code:'black',name:'블랙'},{code:'white',name:'화이트'}].map(opt => (
              <label key={opt.code} className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={cfg.options?.includes(opt.code)}
                  onChange={(e) => toggleArrayOption(block.id, opt.code, e.target.checked)}
                />
                {opt.name}
              </label>
            ))}
          </div>
        </div>
      );

    case 'spring_options':
      return (
        <div className="space-y-4">
          {/* PP 옵션 - 가로 체크박스 */}
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 font-medium">PP (전면 커버)</label>
              <div className="flex items-center gap-4">
                {cfg.pp?.options?.map(opt => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                    onDoubleClick={() => {
                      const newOptions = cfg.pp.options.map(o => ({ ...o, default: o.id === opt.id }));
                      updateCfg(block.id, 'pp', { ...cfg.pp, options: newOptions });
                    }}
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={opt.enabled}
                      onChange={(e) => {
                        const newOptions = cfg.pp.options.map(o =>
                          o.id === opt.id ? { ...o, enabled: e.target.checked } : o
                        );
                        updateCfg(block.id, 'pp', { ...cfg.pp, options: newOptions });
                      }}
                    />
                    <span className={opt.default ? 'font-medium' : ''}>{opt.label}</span>
                    {opt.default && <span className="text-gray-500 text-xs">★</span>}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 3열 드롭다운 레이아웃 */}
          <div className="grid grid-cols-3 gap-4">
            {/* 표지인쇄 */}
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <label className="text-xs text-gray-400 font-medium block mb-3">표지인쇄</label>
              <select
                className="select select-bordered select-sm w-full mb-3"
                value={cfg.coverPrint?.options?.find(o => o.default)?.id || ''}
                onChange={(e) => {
                  const newOptions = cfg.coverPrint.options.map(o => ({ ...o, default: o.id === e.target.value }));
                  updateCfg(block.id, 'coverPrint', { ...cfg.coverPrint, options: newOptions });
                }}
              >
                {cfg.coverPrint?.options?.filter(o => o.enabled).map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <div className="space-y-1">
                {cfg.coverPrint?.options?.map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs"
                      checked={opt.enabled}
                      onChange={(e) => {
                        const newOptions = cfg.coverPrint.options.map(o =>
                          o.id === opt.id ? { ...o, enabled: e.target.checked } : o
                        );
                        updateCfg(block.id, 'coverPrint', { ...cfg.coverPrint, options: newOptions });
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* 뒷판 */}
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <label className="text-xs text-gray-400 font-medium block mb-3">뒷판</label>
              <select
                className="select select-bordered select-sm w-full mb-3"
                value={cfg.back?.options?.find(o => o.default)?.id || ''}
                onChange={(e) => {
                  const newOptions = cfg.back.options.map(o => ({ ...o, default: o.id === e.target.value }));
                  updateCfg(block.id, 'back', { ...cfg.back, options: newOptions });
                }}
              >
                {cfg.back?.options?.filter(o => o.enabled).map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <div className="space-y-1">
                {cfg.back?.options?.map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs"
                      checked={opt.enabled}
                      onChange={(e) => {
                        const newOptions = cfg.back.options.map(o =>
                          o.id === opt.id ? { ...o, enabled: e.target.checked } : o
                        );
                        updateCfg(block.id, 'back', { ...cfg.back, options: newOptions });
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-300 mt-2 pt-2 border-t border-gray-200">앞뒤표지 시 비활성화</p>
            </div>

            {/* 스프링 색상 */}
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <label className="text-xs text-gray-400 font-medium block mb-3">스프링 색상</label>
              <select
                className="select select-bordered select-sm w-full mb-3"
                value={cfg.springColor?.options?.find(o => o.default)?.id || ''}
                onChange={(e) => {
                  const newOptions = cfg.springColor.options.map(o => ({ ...o, default: o.id === e.target.value }));
                  updateCfg(block.id, 'springColor', { ...cfg.springColor, options: newOptions });
                }}
              >
                {cfg.springColor?.options?.filter(o => o.enabled).map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <div className="space-y-1">
                {cfg.springColor?.options?.map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs"
                      checked={opt.enabled}
                      onChange={(e) => {
                        const newOptions = cfg.springColor.options.map(o =>
                          o.id === opt.id ? { ...o, enabled: e.target.checked } : o
                        );
                        updateCfg(block.id, 'springColor', { ...cfg.springColor, options: newOptions });
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 표지 용지 설정 */}
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <label className="text-xs text-gray-400 font-medium block mb-3">표지 용지 (앞표지/앞뒤표지 선택 시)</label>
            <div className="grid grid-cols-2 gap-4">
              {papersList.map(paper => {
                const isOn = cfg.coverPrint?.papers && cfg.coverPrint.papers[paper.code];
                return (
                  <div key={paper.code} className="space-y-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={!!isOn}
                        onChange={(e) => {
                          let papersObj = { ...cfg.coverPrint?.papers };
                          if (e.target.checked) {
                            papersObj[paper.code] = DB.weights[paper.code].filter(w => w >= 150).slice(0, 3);
                          } else {
                            delete papersObj[paper.code];
                          }
                          updateCfg(block.id, 'coverPrint', { ...cfg.coverPrint, papers: papersObj });
                        }}
                      />
                      <span className="font-medium">{paper.name}</span>
                    </label>
                    {isOn && (
                      <div className="flex flex-wrap gap-1 ml-6">
                        {DB.weights[paper.code]?.filter(w => w >= 150).map(w => (
                          <label key={w} className="inline-flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 transition-colors">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-xs"
                              checked={cfg.coverPrint.papers[paper.code]?.includes(w)}
                              onChange={(e) => {
                                let papersObj = { ...cfg.coverPrint.papers };
                                let ws = papersObj[paper.code] || [];
                                if (e.target.checked) {
                                  if (!ws.includes(w)) ws = [...ws, w].sort((a,b) => a-b);
                                } else {
                                  ws = ws.filter(ww => ww !== w);
                                }
                                papersObj[paper.code] = ws;
                                updateCfg(block.id, 'coverPrint', { ...cfg.coverPrint, papers: papersObj });
                              }}
                            />
                            {w}g
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 연동 규칙 안내 */}
          <p className="text-xs text-gray-400">
            PP=없음 AND 표지인쇄=없음 → 에러 · 표지인쇄=앞뒤표지 → 뒷판 비활성화
          </p>
        </div>
      );

    case 'delivery':
      // 배열 구조로 출고일 옵션 관리
      const defaultDeliveryOptions = [
        { id: 'same', label: '당일', enabled: false, percent: 30 },
        { id: 'next1', label: '1영업일', enabled: true, percent: 15 },
        { id: 'next2', label: '2영업일', enabled: true, percent: 0 },
        { id: 'next3', label: '3영업일', enabled: true, percent: -5 },
      ];

      // 기존 개별 키 데이터 마이그레이션 (cfg.same, cfg.next1 등이 있는 경우)
      const deliveryOptions = cfg.options?.length > 0 ? cfg.options :
        (cfg.same !== undefined || cfg.next1 !== undefined) ? [
          { id: 'same', label: '당일', enabled: !!(cfg.same?.enabled ?? cfg.same), percent: cfg.same?.rate ?? 30 },
          { id: 'next1', label: '1영업일', enabled: !!(cfg.next1?.enabled ?? cfg.next1), percent: cfg.next1?.rate ?? 15 },
          { id: 'next2', label: '2영업일', enabled: !!(cfg.next2?.enabled ?? cfg.next2), percent: cfg.next2?.rate ?? 0 },
          { id: 'next3', label: '3영업일', enabled: !!(cfg.next3?.enabled ?? cfg.next3), percent: cfg.next3?.rate ?? -5 },
        ] : defaultDeliveryOptions;

      // 옵션 업데이트 함수
      const updateDeliveryOption = (optId, field, value) => {
        const newOptions = deliveryOptions.map(opt =>
          opt.id === optId ? { ...opt, [field]: value } : opt
        );
        updateCfg(block.id, 'options', newOptions);
      };

      // 출고일 옵션 추가 함수
      const addDeliveryOption = () => {
        const newId = `custom_${Date.now()}`;
        const newOptions = [...deliveryOptions, { id: newId, label: '새 옵션', enabled: true, percent: 0 }];
        updateCfg(block.id, 'options', newOptions);
      };

      // 출고일 옵션 삭제 함수
      const removeDeliveryOption = (optId) => {
        if (deliveryOptions.length <= 1) return; // 최소 1개는 유지
        const newOptions = deliveryOptions.filter(opt => opt.id !== optId);
        // 삭제된 옵션이 기본값이었다면 첫 번째 활성화된 옵션을 기본값으로
        if (cfg.default === optId) {
          const firstEnabled = newOptions.find(o => o.enabled);
          if (firstEnabled) {
            updateCfg(block.id, 'default', firstEnabled.id);
          }
        }
        updateCfg(block.id, 'options', newOptions);
      };

      // 라벨 수정 함수
      const updateDeliveryLabel = (optId, newLabel) => {
        const newOptions = deliveryOptions.map(opt =>
          opt.id === optId ? { ...opt, label: newLabel } : opt
        );
        updateCfg(block.id, 'options', newOptions);
      };

      return (
        <div className="space-y-4">
          <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg">
            더블클릭으로 기본값 설정 (★ 표시)
          </p>
          <div>
            <label className="text-xs text-gray-500 block mb-2">마감 시간</label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={cfg.cutoffTime || '12:00'}
                onChange={(e) => updateCfg(block.id, 'cutoffTime', e.target.value)}
                className="select select-bordered select-sm"
              />
              <span className="text-xs text-gray-400">마감</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">출고일 옵션 및 가격 조정</label>
            <div className="space-y-2">
              {deliveryOptions.map(opt => (
                <div
                  key={opt.id}
                  className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border cursor-pointer hover:bg-white"
                  onDoubleClick={() => updateCfg(block.id, 'default', opt.id)}
                >
                  <input
                    type="checkbox"
                    checked={opt.enabled}
                    onChange={(e) => updateDeliveryOption(opt.id, 'enabled', e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="checkbox checkbox-sm"
                  />
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => updateDeliveryLabel(opt.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-24 px-2 py-1 border rounded text-sm"
                    placeholder="라벨"
                  />
                  {cfg.default === opt.id && <span className="text-warning">★</span>}
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={opt.percent}
                      onChange={(e) => updateDeliveryOption(opt.id, 'percent', parseInt(e.target.value) || 0)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 px-2 py-1 border rounded text-sm text-center"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                  <span className="text-xs text-gray-400 w-16">
                    {opt.percent > 0 ? `+${opt.percent}%` : opt.percent === 0 ? '기준가' : `${opt.percent}%`}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeDeliveryOption(opt.id); }}
                    className="text-gray-400 hover:text-error ml-auto"
                    title="삭제"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addDeliveryOption}
              className="mt-2 text-sm text-neutral-600 hover:text-neutral-800 flex items-center gap-1"
            >
              <span>+</span> 출고일 추가
            </button>
          </div>
        </div>
      );
      
    case 'quantity':
      return (
        <div>
          <p className="text-xs text-info bg-info/10 px-3 py-2 rounded-lg mb-3">
            더블클릭으로 기본값 설정 (★ 표시)
          </p>
          <label className="text-xs text-gray-500 block mb-2">수량 옵션</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {cfg.options?.map(q => (
              <span
                key={q}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-50 text-gray-700 rounded-lg text-sm cursor-pointer hover:bg-gray-100"
                onDoubleClick={() => updateCfg(block.id, 'default', q)}
              >
                {q}부
                {cfg.default === q && <span className="text-warning">★</span>}
                <button onClick={() => removeQty(block.id, q)} className="text-gray-400 hover:text-error ml-1">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={newQtyInput}
              onChange={(e) => setNewQtyInput(e.target.value)}
              placeholder="수량 추가"
              className="flex-1 select select-bordered select-sm"
            />
            <button
              onClick={() => { addQty(block.id, parseInt(newQtyInput)); setNewQtyInput(''); }}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-900"
            >
              추가
            </button>
          </div>
        </div>
      );
      
    case 'pages_saddle':
    case 'pages_leaf':
    case 'pages':
      return (
        <div className="space-y-4">
          {/* 페이지 수 범위 */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">최소</label>
              <input
                type="number"
                value={cfg.min}
                onChange={(e) => updateCfg(block.id, 'min', parseInt(e.target.value))}
                className="w-full select select-bordered select-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">최대</label>
              <input
                type="number"
                value={cfg.max}
                onChange={(e) => updateCfg(block.id, 'max', parseInt(e.target.value))}
                className="w-full select select-bordered select-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">단위</label>
              <input
                type="number"
                value={cfg.step}
                onChange={(e) => updateCfg(block.id, 'step', parseInt(e.target.value))}
                className="w-full select select-bordered select-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">기본값</label>
              <input
                type="number"
                value={cfg.default || cfg.min}
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                onChange={(e) => updateCfg(block.id, 'default', parseInt(e.target.value))}
                className="w-full select select-bordered select-sm"
              />
            </div>
          </div>
          
          {/* 제본 타입 선택 (pages 타입일 때만) */}
          {block.type === 'pages' && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="text-xs text-gray-600 font-medium block mb-2">제본 타입</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`bindingType_${block.id}`}
                    checked={cfg.bindingType === 'saddle'}
                    onChange={() => updateCfg(block.id, 'bindingType', 'saddle')}
                  />
                  <span className="text-sm">중철 (4p 표지 분리)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`bindingType_${block.id}`}
                    checked={cfg.bindingType === 'leaf'}
                    onChange={() => updateCfg(block.id, 'bindingType', 'leaf')}
                  />
                  <span className="text-sm">낱장 (무선/스프링)</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                📌 수식: {cfg.bindingType === 'saddle' ? '내지 페이지 = 총 페이지 - 4 (표지 제외)' : '내지 페이지 = 입력값 그대로'}
              </p>
            </div>
          )}

          {/* 연동 블록 선택 UI - bindingType이 설정된 경우에만 표시 */}
          {block.type === 'pages' && cfg.bindingType && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <label className="text-xs text-amber-700 font-medium block mb-3">
                연동 블록 선택 (필수)
              </label>
              <p className="text-xs text-amber-600 mb-3">
                페이지 수에 따라 용지/인쇄 비용을 계산할 블록을 선택하세요.
              </p>

              {/* 중철일 때: 내지 블록만 선택 (표지는 별도 계산됨) */}
              {cfg.bindingType === 'saddle' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    표지는 별도 옵션에서 자동 계산됩니다. 내지만 연동하세요.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">내지 용지 블록</label>
                      <select
                        value={cfg.linkedBlocks?.innerPaper || ''}
                        onChange={(e) => updateCfg(block.id, 'linkedBlocks', {
                          ...cfg.linkedBlocks,
                          innerPaper: parseInt(e.target.value) || null
                        })}
                        className={`select select-bordered select-sm w-full ${!cfg.linkedBlocks?.innerPaper ? 'border-error' : ''}`}
                      >
                        <option value="">선택하세요</option>
                        {allBlocks?.filter(b => b.type === 'paper' && b.id !== block.id).map(b => (
                          <option key={b.id} value={b.id}>{b.label} (ID: {b.id})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">내지 인쇄 블록</label>
                      <select
                        value={cfg.linkedBlocks?.innerPrint || ''}
                        onChange={(e) => updateCfg(block.id, 'linkedBlocks', {
                          ...cfg.linkedBlocks,
                          innerPrint: parseInt(e.target.value) || null
                        })}
                        className={`select select-bordered select-sm w-full ${!cfg.linkedBlocks?.innerPrint ? 'border-error' : ''}`}
                      >
                        <option value="">선택하세요</option>
                        {allBlocks?.filter(b => b.type === 'print' && b.id !== block.id).map(b => (
                          <option key={b.id} value={b.id}>{b.label} (ID: {b.id})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 낱장(무선/스프링)일 때: 내지 블록만 선택 (2개) */}
              {cfg.bindingType === 'leaf' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">내지 용지 블록</label>
                    <select
                      value={cfg.linkedBlocks?.innerPaper || ''}
                      onChange={(e) => updateCfg(block.id, 'linkedBlocks', {
                        ...cfg.linkedBlocks,
                        innerPaper: parseInt(e.target.value) || null
                      })}
                      className={`select select-bordered select-sm w-full ${!cfg.linkedBlocks?.innerPaper ? 'border-error' : ''}`}
                    >
                      <option value="">선택하세요</option>
                      {allBlocks?.filter(b => b.type === 'paper' && b.id !== block.id).map(b => (
                        <option key={b.id} value={b.id}>{b.label} (ID: {b.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">내지 인쇄 블록</label>
                    <select
                      value={cfg.linkedBlocks?.innerPrint || ''}
                      onChange={(e) => updateCfg(block.id, 'linkedBlocks', {
                        ...cfg.linkedBlocks,
                        innerPrint: parseInt(e.target.value) || null
                      })}
                      className={`select select-bordered select-sm w-full ${!cfg.linkedBlocks?.innerPrint ? 'border-error' : ''}`}
                    >
                      <option value="">선택하세요</option>
                      {allBlocks?.filter(b => b.type === 'print' && b.id !== block.id).map(b => (
                        <option key={b.id} value={b.id}>{b.label} (ID: {b.id})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* 연동 상태 표시 */}
              {(() => {
                const hasAllLinks = cfg.bindingType === 'saddle'
                  ? (cfg.linkedBlocks?.coverPaper && cfg.linkedBlocks?.coverPrint &&
                     cfg.linkedBlocks?.innerPaper && cfg.linkedBlocks?.innerPrint)
                  : (cfg.linkedBlocks?.innerPaper && cfg.linkedBlocks?.innerPrint);

                return !hasAllLinks ? (
                  <div className="mt-3 p-2 bg-error/10 rounded border border-error/30">
                    <p className="text-xs text-error">
                      모든 연동 블록을 선택해야 가격 계산이 정상 작동합니다.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 p-2 bg-success/10 rounded border border-success/30">
                    <p className="text-xs text-success">연동 설정 완료</p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      );
      
    case 'inner_layer_saddle':
    case 'inner_layer_leaf':
      return (
        <div className="space-y-4">
          {/* 내지 용지 */}
          <div className="p-3 bg-white rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500 font-medium">내지 용지</label>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={cfg.paperLocked} onChange={(e) => updateCfg(block.id, 'paperLocked', e.target.checked)} />
                  고정
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={cfg.paperHidden} onChange={(e) => updateCfg(block.id, 'paperHidden', e.target.checked)} />
                  숨김
                </label>
              </div>
            </div>
            {papersList.map(paper => {
              const isOn = cfg.papers && cfg.papers[paper.code];
              return (
                <div key={paper.code} className="mb-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!isOn}
                      onChange={(e) => {
                        let papersObj = { ...cfg.papers };
                        if (e.target.checked) {
                          papersObj[paper.code] = DB.weights[paper.code].filter(w => w <= 120).slice(0, 3);
                        } else {
                          delete papersObj[paper.code];
                        }
                        updateCfg(block.id, 'papers', papersObj);
                      }}
                    />
                    {paper.name}
                  </label>
                  {isOn && (
                    <div className="flex flex-wrap gap-2 mt-1 ml-6">
                      {DB.weights[paper.code]?.filter(w => w <= 150).map(w => (
                        <label key={w} className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cfg.papers[paper.code]?.includes(w)}
                            onChange={(e) => {
                              let papersObj = { ...cfg.papers };
                              let ws = papersObj[paper.code] || [];
                              if (e.target.checked) {
                                if (!ws.includes(w)) ws = [...ws, w].sort((a,b) => a-b);
                              } else {
                                ws = ws.filter(ww => ww !== w);
                              }
                              papersObj[paper.code] = ws;
                              updateCfg(block.id, 'papers', papersObj);
                            }}
                          />
                          {w}g
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* 내지 인쇄 - 컬러 */}
          <div className="p-3 bg-white rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500 font-medium">내지 인쇄 - 컬러</label>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={cfg.printColorLocked} onChange={(e) => updateCfg(block.id, 'printColorLocked', e.target.checked)} />
                  고정
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={cfg.printColorHidden} onChange={(e) => updateCfg(block.id, 'printColorHidden', e.target.checked)} />
                  숨김
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={cfg.color} onChange={(e) => updateCfg(block.id, 'color', e.target.checked)} />
                컬러
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={cfg.mono} onChange={(e) => updateCfg(block.id, 'mono', e.target.checked)} />
                흑백
              </label>
            </div>
          </div>
          
          {/* 내지 인쇄 - 면수 */}
          <div className="p-3 bg-white rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500 font-medium">내지 인쇄 - 면수</label>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={cfg.printSideLocked} onChange={(e) => updateCfg(block.id, 'printSideLocked', e.target.checked)} />
                  고정
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={cfg.printSideHidden} onChange={(e) => updateCfg(block.id, 'printSideHidden', e.target.checked)} />
                  숨김
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={cfg.single} onChange={(e) => updateCfg(block.id, 'single', e.target.checked)} />
                단면
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={cfg.double} onChange={(e) => updateCfg(block.id, 'double', e.target.checked)} />
                양면
              </label>
            </div>
          </div>
          
          {/* 페이지 수 */}
          <div className="p-3 bg-white rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500 font-medium">페이지 수</label>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={cfg.pagesLocked} onChange={(e) => updateCfg(block.id, 'pagesLocked', e.target.checked)} />
                  고정
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={cfg.pagesHidden} onChange={(e) => updateCfg(block.id, 'pagesHidden', e.target.checked)} />
                  숨김
                </label>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">최소</label>
                <input 
                  type="number" 
                  value={cfg.min}
                  onChange={(e) => updateCfg(block.id, 'min', parseInt(e.target.value))}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">최대</label>
                <input 
                  type="number" 
                  value={cfg.max}
                  onChange={(e) => updateCfg(block.id, 'max', parseInt(e.target.value))}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">단위</label>
                <input 
                  type="number" 
                  value={cfg.step}
                  onChange={(e) => updateCfg(block.id, 'step', parseInt(e.target.value))}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>
            {block.type === 'inner_layer_saddle' && (
              <p className="text-xs text-gray-600 mt-2">📌 수식: 내지 페이지 = 총 페이지 - 4 (표지 제외)</p>
            )}
          </div>
        </div>
      );
      
    default:
      return <p className="text-xs text-gray-400">설정 없음</p>;
  }
}

// ============================================================
// 미리보기 블록 컴포넌트
// ============================================================
export function PreviewBlock({ block, customer, setCustomer, calculatePrice, linkStatus, handleFoldSelect, productType, dbPapers = {}, dbPapersList = [], allBlocks = [] }) {
  const cfg = block.config;
  const isDisabled = block.locked;
  
  // 뒷판 비활성화 체크
  if (block.type === 'back' && linkStatus?.backDisabled) {
    return (
      <div className="mb-4 opacity-50">
        <p className="text-sm font-medium text-gray-400 mb-2">{block.label} <span className="text-xs">(앞뒤표지 선택으로 비활성화)</span></p>
        <div className="p-3 border rounded-xl border-gray-200 bg-white">
          <p className="text-xs text-gray-400">앞뒤표지 인쇄 선택 시 뒷판이 필요하지 않습니다.</p>
        </div>
      </div>
    );
  }
  
  switch (block.type) {
    case 'size':
      return (
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>
          <div className="flex gap-2">
            {cfg.options?.map(s => (
              <button
                key={s}
                disabled={isDisabled}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                  customer.size === s
                    ? 'bg-white border-[#222828] text-[#222828] font-medium'
                    : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, size: s }))}
              >
                {DB.sizeMultipliers[s]?.name || s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      );
      
    case 'paper':
      // 블록 label 기준으로 필드명 결정 (블록별 독립 저장)
      const isCoverPaper = block.label.includes('표지');
      const isInnerPaper = block.label.includes('내지');
      const paperField = isCoverPaper ? 'coverPaper' : isInnerPaper ? 'innerPaper' : 'paper';
      const weightField = isCoverPaper ? 'coverWeight' : isInnerPaper ? 'innerWeight' : 'weight';

      return (
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>
          <div className="space-y-2">
            {Object.entries(cfg.papers || {}).map(([code, weights]) => {
              const paper = dbPapersList.find(p => p.code === code) || DB.papers.find(p => p.code === code);
              if (!paper || !weights.length) return null;
              const isSelected = customer[paperField] === code;
              return (
                <div
                  key={code}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border-[1.5px] ${
                    isSelected ? 'bg-white border-[#222828] ' : 'bg-white border-[#cbd0d0] hover:border-[#8a9292]'
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, [paperField]: code, [weightField]: weights[0] }))}
                >
                  {/* 용지 이미지 */}
                  <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden">
                    {dbPapers[code]?.image_url ? (
                      <img src={dbPapers[code].image_url} alt={dbPapers[code]?.name || paper.name} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{
                          background: code === 'snow'
                            ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)'
                            : code === 'mojo'
                            ? 'linear-gradient(135deg, #fefcf3 0%, #fef3c7 50%, #fde68a 100%)'
                            : code === 'artpaper'
                            ? 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)'
                            : code === 'rendezvous'
                            ? 'linear-gradient(135deg, #faf5ef 0%, #f5ebe0 50%, #eddfcc 100%)'
                            : code === 'inspire' || code === 'inspirer'
                            ? 'linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 50%, #d6d3d1 100%)'
                            : 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)'
                        }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{dbPapers[code]?.name || paper.name}</p>
                    <p className="text-xs text-gray-400 truncate">{dbPapers[code]?.desc || paper.desc}</p>
                  </div>
                  <div className="flex gap-1">
                    {weights.map(w => (
                      <button
                        key={w}
                        disabled={isDisabled}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-all border-[1.5px] ${
                          isSelected && customer[weightField] === w
                            ? 'bg-white border-[#222828] text-[#222828] font-medium'
                            : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                        }`}
                        onClick={(e) => { e.stopPropagation(); !isDisabled && setCustomer(prev => ({ ...prev, [paperField]: code, [weightField]: w })); }}
                      >
                        {w}g
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
      
    case 'pp':
      return (
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>
          <div className="flex gap-2">
            {cfg.options?.map(o => (
              <button
                key={o}
                disabled={isDisabled}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                  customer.pp === o
                    ? 'bg-white border-[#222828] text-[#222828] font-medium'
                    : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                }`}
                onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, pp: o }))}
              >
                {o === 'clear' ? '투명' : o === 'frosted' ? '불투명' : '없음'}
              </button>
            ))}
          </div>
        </div>
      );
      
    case 'cover_print':
      return (
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>
          <div className="flex gap-2 mb-3">
            {cfg.options?.map(o => (
              <button
                key={o}
                disabled={isDisabled}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                  customer.coverPrint === o
                    ? 'bg-white border-[#222828] text-[#222828] font-medium'
                    : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                }`}
                onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, coverPrint: o }))}
              >
                {o === 'none' ? '없음' : o === 'front_only' ? '앞표지만' : '앞뒤표지'}
              </button>
            ))}
          </div>

          {/* 표지인쇄 선택 시 용지 선택 표시 */}
          {customer.coverPrint !== 'none' && cfg.papers && (
            <div className="pt-3 mt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">표지 용지</p>
              <div className="space-y-2">
                {Object.entries(cfg.papers).map(([code, weights]) => {
                  const paper = dbPapersList.find(p => p.code === code) || DB.papers.find(p => p.code === code);
                  if (!paper || !weights.length) return null;
                  const isSelected = customer.coverPaper === code;
                  return (
                    <div
                      key={code}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer border-[1.5px] transition-all ${
                        isSelected ? 'bg-white border-[#222828] ' : 'bg-white border-[#cbd0d0] hover:border-[#8a9292]'
                      }`}
                      onClick={() => setCustomer(prev => ({ ...prev, coverPaper: code, coverWeight: weights[0] }))}
                    >
                      <span className={`text-sm ${isSelected ? 'font-medium' : ''}`}>{paper.name}</span>
                      <div className="flex gap-1">
                        {weights.map(w => (
                          <button
                            key={w}
                            className={`px-2.5 py-1 text-xs rounded-lg transition-all border-[1.5px] ${
                              isSelected && customer.coverWeight === w
                                ? 'bg-white border-[#222828] text-[#222828] font-medium'
                                : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                            }`}
                            onClick={(e) => { e.stopPropagation(); setCustomer(prev => ({ ...prev, coverPaper: code, coverWeight: w })); }}
                          >
                            {w}g
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
      
    case 'print': {
      // 제본 상품에서 내지인쇄는 innerColor/innerSide 키 사용
      const isBinding = ['saddle', 'perfect', 'spring'].includes(productType);
      const isInner = isBinding && allBlocks.some(b => b.config?.linkedBlocks?.innerPrint === block.id);
      const colorKey = isInner ? 'innerColor' : 'color';
      const sideKey = isInner ? 'innerSide' : 'side';
      return (
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">컬러</p>
              <div className="flex gap-2">
                {cfg.color && (
                  <button
                    disabled={isDisabled}
                    className={`flex-1 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                      customer[colorKey] === 'color'
                        ? 'bg-white border-[#222828] text-[#222828] font-medium'
                        : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                    }`}
                    onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, [colorKey]: 'color' }))}
                  >
                    컬러
                  </button>
                )}
                {cfg.mono && (
                  <button
                    disabled={isDisabled}
                    className={`flex-1 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                      customer[colorKey] === 'mono'
                        ? 'bg-white border-[#222828] text-[#222828] font-medium'
                        : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                    }`}
                    onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, [colorKey]: 'mono' }))}
                  >
                    흑백
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">인쇄면</p>
              <div className="flex gap-2">
                {cfg.single && (
                  <button
                    disabled={isDisabled}
                    className={`flex-1 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                      customer[sideKey] === 'single'
                        ? 'bg-white border-[#222828] text-[#222828] font-medium'
                        : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                    }`}
                    onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, [sideKey]: 'single' }))}
                  >
                    단면
                  </button>
                )}
                {cfg.double && (
                  <button
                    disabled={isDisabled}
                    className={`flex-1 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                      customer[sideKey] === 'double'
                        ? 'bg-white border-[#222828] text-[#222828] font-medium'
                        : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                    }`}
                    onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, [sideKey]: 'double' }))}
                  >
                    양면
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
      

    case 'finishing':
      return (
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>
          <div className="space-y-3">
            {/* 후가공 옵션 체크박스 */}
            <div className="flex gap-2 flex-wrap">
              {cfg.coating?.enabled && (() => {
                // 코팅 대상 용지 평량 결정
                let currentWeight = 80;
                if (cfg.coating?.linkedPaper) {
                  // 연동된 용지 블록에서 평량 가져오기
                  const linkedBlock = allBlocks?.find(b => b.id === cfg.coating.linkedPaper);
                  if (linkedBlock) {
                    // 블록 라벨로 어떤 weight 필드인지 결정
                    const isCover = linkedBlock.label?.includes('표지');
                    const isInner = linkedBlock.label?.includes('내지');
                    if (linkedBlock.type === 'inner_layer_saddle' || linkedBlock.type === 'inner_layer_leaf' || isInner) {
                      currentWeight = customer.innerWeight || 80;
                    } else if (linkedBlock.type === 'cover_print' || isCover) {
                      currentWeight = customer.coverWeight || 80;
                    } else {
                      currentWeight = customer.weight || 80;
                    }
                  }
                } else {
                  // 자동: 표지 > 메인 > 내지 순으로 체크
                  currentWeight = customer.coverWeight || customer.weight || customer.innerWeight || 80;
                }
                const coatingValidation = validateCoatingWeight(currentWeight);
                const isCoatingDisabled = !coatingValidation.valid;

                return (
                  <div className="relative group">
                    <button
                      disabled={isCoatingDisabled}
                      className={`px-4 py-2 rounded-xl text-sm transition-all border-[1.5px] ${
                        isCoatingDisabled
                          ? 'bg-[#f5f7f7] text-[#8a9292] border-[#cbd0d0] cursor-not-allowed'
                          : customer.finishing?.coating
                            ? 'bg-white border-[#222828] text-[#222828] font-medium'
                            : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                      }`}
                      onClick={() => !isCoatingDisabled && setCustomer(prev => ({
                        ...prev,
                        finishing: {
                          ...prev.finishing,
                          coating: !prev.finishing?.coating,
                          coatingType: !prev.finishing?.coating ? (prev.finishing?.coatingType || 'matte') : null,
                          coatingSide: !prev.finishing?.coating ? (prev.finishing?.coatingSide || 'single') : null
                        }
                      }))}
                    >
                      코팅
                    </button>
                    {isCoatingDisabled && (
                      <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-10">
                        <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                          {coatingValidation.message}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              {cfg.osi?.enabled && (
                <button
                  className={`px-4 py-2 rounded-xl text-sm transition-all border-[1.5px] ${
                    customer.finishing?.osiEnabled
                      ? 'bg-white border-[#222828] text-[#222828] font-medium'
                      : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                  }`}
                  onClick={() => setCustomer(prev => ({
                    ...prev,
                    finishing: {
                      ...prev.finishing,
                      osiEnabled: !prev.finishing?.osiEnabled,
                      osi: !prev.finishing?.osiEnabled ? (prev.finishing?.osi || 1) : null
                    }
                  }))}
                >
                  오시
                </button>
              )}
              {cfg.fold?.enabled && (
                <button
                  className={`px-4 py-2 rounded-xl text-sm transition-all border-[1.5px] ${
                    customer.finishing?.foldEnabled
                      ? 'bg-white border-[#222828] text-[#222828] font-medium'
                      : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                  }`}
                  onClick={() => {
                    if (!customer.finishing?.foldEnabled) {
                      handleFoldSelect(customer.finishing?.fold || 2, cfg);
                    } else {
                      setCustomer(prev => ({
                        ...prev,
                        finishing: { ...prev.finishing, foldEnabled: false, fold: null, osiEnabled: false, osi: null }
                      }));
                    }
                  }}
                >
                  접지
                </button>
              )}
              {cfg.corner && (
                <button
                  className={`px-4 py-2 rounded-xl text-sm transition-all border-[1.5px] ${
                    customer.finishing?.corner
                      ? 'bg-white border-[#222828] text-[#222828] font-medium'
                      : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                  }`}
                  onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, corner: !prev.finishing?.corner } }))}
                >
                  귀도리
                </button>
              )}
              {cfg.punch && (
                <button
                  className={`px-4 py-2 rounded-xl text-sm transition-all border-[1.5px] ${
                    customer.finishing?.punch
                      ? 'bg-white border-[#222828] text-[#222828] font-medium'
                      : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                  }`}
                  onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, punch: !prev.finishing?.punch } }))}
                >
                  타공
                </button>
              )}
              {cfg.mising && (
                <button
                  className={`px-4 py-2 rounded-xl text-sm transition-all border-[1.5px] ${
                    customer.finishing?.mising
                      ? 'bg-white border-[#222828] text-[#222828] font-medium'
                      : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                  }`}
                  onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, mising: !prev.finishing?.mising } }))}
                >
                  미싱
                </button>
              )}
            </div>

            {/* 코팅 하위 옵션 */}
            {customer.finishing?.coating && cfg.coating?.enabled && (
              <div className="pl-4 pt-3 border-l-2 border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    {(cfg.coating?.matte ?? true) && (
                      <button
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all border-[1.5px] ${
                          customer.finishing?.coatingType === 'matte'
                            ? 'bg-white border-[#222828] text-[#222828] font-medium'
                            : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                        }`}
                        onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, coatingType: 'matte' } }))}
                      >
                        무광
                      </button>
                    )}
                    {(cfg.coating?.gloss ?? true) && (
                      <button
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all border-[1.5px] ${
                          customer.finishing?.coatingType === 'gloss'
                            ? 'bg-white border-[#222828] text-[#222828] font-medium'
                            : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                        }`}
                        onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, coatingType: 'gloss' } }))}
                      >
                        유광
                      </button>
                    )}
                  </div>
                  <span className="text-gray-300">|</span>
                  <div className="flex gap-2">
                    {(cfg.coating?.single ?? true) && (
                      <button
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all border-[1.5px] ${
                          customer.finishing?.coatingSide === 'single'
                            ? 'bg-white border-[#222828] text-[#222828] font-medium'
                            : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                        }`}
                        onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, coatingSide: 'single' } }))}
                      >
                        단면
                      </button>
                    )}
                    {(cfg.coating?.double ?? true) && (
                      <button
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all border-[1.5px] ${
                          customer.finishing?.coatingSide === 'double'
                            ? 'bg-white border-[#222828] text-[#222828] font-medium'
                            : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                        }`}
                        onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, coatingSide: 'double' } }))}
                      >
                        양면
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 오시 하위 옵션 */}
            {customer.finishing?.osiEnabled && cfg.osi?.enabled && (
              <div className="pl-4 pt-3 border-l-2 border-gray-200">
                <div className="flex gap-2">
                  {[1, 2, 3].map(n => (
                    <button
                      key={n}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all border-[1.5px] ${
                        customer.finishing?.osi === n
                          ? 'bg-white border-[#222828] text-[#222828] font-medium'
                          : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                      }`}
                      onClick={() => setCustomer(prev => ({ ...prev, finishing: { ...prev.finishing, osi: n } }))}
                    >
                      {n}줄
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 접지 하위 옵션 */}
            {customer.finishing?.foldEnabled && cfg.fold?.enabled && (
              <div className="pl-4 pt-3 border-l-2 border-gray-200">
                <div className="flex gap-2">
                  {[2, 3, 4].map(n => (
                    <button
                      key={n}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all border-[1.5px] ${
                        customer.finishing?.fold === n
                          ? 'bg-white border-[#222828] text-[#222828] font-medium'
                          : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                      }`}
                      onClick={() => handleFoldSelect(n, cfg)}
                    >
                      {n}단
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
      
    case 'back':
      return (
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>
          <div className="flex gap-2">
            {cfg.options?.map(o => (
              <button
                key={o}
                disabled={isDisabled}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                  customer.back === o
                    ? 'bg-white border-[#222828] text-[#222828] font-medium'
                    : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                }`}
                onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, back: o }))}
              >
                {o === 'white' ? '화이트' : o === 'black' ? '블랙' : '없음'}
              </button>
            ))}
          </div>
        </div>
      );

    case 'spring_color':
      return (
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>
          <div className="flex gap-2">
            {cfg.options?.map(o => (
              <button
                key={o}
                disabled={isDisabled}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm transition-all border-[1.5px] ${
                  customer.springColor === o
                    ? 'bg-white border-[#222828] text-[#222828] font-medium'
                    : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                }`}
                onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, springColor: o }))}
              >
                {o === 'black' ? '블랙' : '화이트'}
              </button>
            ))}
          </div>
        </div>
      );

    case 'spring_options':
      // PP=없음 AND 표지인쇄=없음 검증
      const ppIsNone = customer.pp === 'none';
      const coverPrintIsNone = customer.coverPrint === 'none';
      const showCoverError = ppIsNone && coverPrintIsNone;

      // 뒷판 비활성화: 표지인쇄=앞뒤표지
      const isBackDisabled = customer.coverPrint === 'front_back';

      return (
        <div className="mb-4">
          <div className="mb-2">
            <p className="text-sm font-medium text-gray-900">{block.label}</p>
            {block.desc && <p className="text-xs text-gray-400">{block.desc}</p>}
          </div>
          <div className="p-3 border rounded-xl border-gray-200 space-y-3">

            {/* 에러 메시지 */}
            {showCoverError && (
              <div className="p-2 bg-error/10 border border-error/30 rounded-lg">
                <p className="text-xs text-error">전면 커버(PP 또는 표지인쇄) 중 하나는 선택해야 합니다.</p>
              </div>
            )}

            {/* PP - 가로 체크박스 */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500 font-medium">PP</span>
              <div className="flex gap-3">
                {cfg.pp?.options?.filter(o => o.enabled).map(opt => (
                  <label key={opt.id} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="pp"
                      checked={customer.pp === opt.id}
                      disabled={isDisabled}
                      onChange={() => !isDisabled && setCustomer(prev => ({ ...prev, pp: opt.id }))}
                      className="radio radio-sm"
                    />
                    <span className="text-xs">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 표지인쇄 / 뒷판 / 스프링색상 - 3칸 드롭다운 */}
            <div className="grid grid-cols-3 gap-2">
              {/* 표지인쇄 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">표지인쇄</label>
                <select
                  value={customer.coverPrint}
                  disabled={isDisabled}
                  onChange={(e) => !isDisabled && setCustomer(prev => ({ ...prev, coverPrint: e.target.value }))}
                  className="select select-bordered select-sm w-full text-xs"
                >
                  {cfg.coverPrint?.options?.filter(o => o.enabled).map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 뒷판 */}
              <div className={isBackDisabled ? 'opacity-50' : ''}>
                <label className="text-xs text-gray-500 mb-1 block">
                  뒷판 {isBackDisabled && <span className="text-gray-400">(자동)</span>}
                </label>
                <select
                  value={customer.back}
                  disabled={isDisabled || isBackDisabled}
                  onChange={(e) => !isDisabled && !isBackDisabled && setCustomer(prev => ({ ...prev, back: e.target.value }))}
                  className="select select-bordered select-sm w-full text-xs"
                >
                  {cfg.back?.options?.filter(o => o.enabled).map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 스프링색상 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">스프링색상</label>
                <select
                  value={customer.springColor}
                  disabled={isDisabled}
                  onChange={(e) => !isDisabled && setCustomer(prev => ({ ...prev, springColor: e.target.value }))}
                  className="select select-bordered select-sm w-full text-xs"
                >
                  {cfg.springColor?.options?.filter(o => o.enabled).map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 표지인쇄 선택 시 용지 선택 */}
            {customer.coverPrint !== 'none' && cfg.coverPrint?.papers && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-400 mb-2">표지 용지 선택</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(cfg.coverPrint.papers).map(([code, weights]) => {
                    const paper = dbPapersList.find(p => p.code === code) || DB.papers.find(p => p.code === code);
                    if (!paper || !weights.length) return null;
                    return weights.map(w => (
                      <button
                        key={`${code}-${w}`}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-all border-[1.5px] ${
                          customer.coverPaper === code && customer.coverWeight === w
                            ? 'bg-white border-[#222828] text-[#222828] font-medium'
                            : 'bg-white border-[#cbd0d0] text-[#222828] hover:border-[#8a9292]'
                        }`}
                        onClick={() => setCustomer(prev => ({ ...prev, coverPaper: code, coverWeight: w }))}
                      >
                        {paper.name} {w}g
                      </button>
                    ));
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      );

    case 'delivery':
      const businessDaysMap = { 'same': 0, 'next1': 1, 'next2': 2, 'next3': 3 };
      return (
        <div className="py-2 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-2">출고일</p>
          <div className="flex gap-1">
            {cfg.options?.filter(opt => opt.enabled).map(opt => {
              const days = businessDaysMap[opt.id] ?? 2;
              const date = getBusinessDate(days);
              const dateStr = formatBusinessDate(date);
              return (
                <button
                  key={opt.id}
                  className={`flex-1 py-3 px-2 rounded-xl text-center transition-all border-[1.5px] ${
                    customer.delivery === opt.id
                      ? 'bg-white border-[#222828] '
                      : 'bg-white border-[#cbd0d0] hover:border-[#8a9292]'
                  }`}
                  onClick={() => setCustomer(prev => ({ ...prev, delivery: opt.id, deliveryPercent: opt.percent }))}
                >
                  <p className={`text-sm font-medium ${customer.delivery === opt.id ? 'text-[#222828]' : 'text-[#222828]'}`}>{dateStr}</p>
                  <p className={`text-xs ${
                    customer.delivery === opt.id
                      ? 'text-[#8a9292]'
                      : opt.percent > 0 ? 'text-red-500' : opt.percent < 0 ? 'text-green-600' : 'text-[#8a9292]'
                  }`}>
                    {opt.percent > 0 ? `+${opt.percent}%` : opt.percent < 0 ? `${opt.percent}%` : '기준가'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      );

    case 'pages_saddle':
    case 'pages_leaf':
    case 'pages':
      return (
        <div className="py-2 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-2">페이지 수</p>
          <div className="flex items-center gap-2">
            <button
              disabled={isDisabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm transition-all"
              onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, pages: Math.max(cfg.min, prev.pages - cfg.step) }))}
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="text-lg font-semibold text-gray-900">{customer.pages}</span>
              <span className="text-gray-400 ml-1 text-sm">p</span>
            </div>
            <button
              disabled={isDisabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm transition-all"
              onClick={() => !isDisabled && setCustomer(prev => ({ ...prev, pages: Math.min(cfg.max, prev.pages + cfg.step) }))}
            >
              +
            </button>
          </div>
        </div>
      );

    case 'inner_layer_saddle':
    case 'inner_layer_leaf':
      return (
        <div className="mb-4 p-4 border rounded-xl bg-white">
          <p className="text-sm font-medium text-gray-900 mb-3">{block.label}</p>
          
          {/* 내지 용지 */}
          {!cfg.paperHidden && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">내지 용지</p>
              {Object.entries(cfg.papers || {}).map(([code, weights]) => {
                const paper = dbPapersList.find(p => p.code === code) || DB.papers.find(p => p.code === code);
                if (!paper || !weights.length) return null;
                return (
                  <div
                    key={code}
                    className={`p-2 border rounded-lg mb-1 cursor-pointer ${
                      customer.innerPaper === code ? 'bg-gray-100 border-gray-400' : 'bg-white border-gray-200'
                    } ${cfg.paperLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !cfg.paperLocked && setCustomer(prev => ({ ...prev, innerPaper: code, innerWeight: weights[0] }))}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{paper.name}</span>
                      <div className="flex gap-1">
                        {weights.map(w => (
                          <button 
                            key={w}
                            disabled={cfg.paperLocked}
                            className={`px-2 py-0.5 text-xs rounded ${
                              customer.innerPaper === code && customer.innerWeight === w ? 'bg-gray-800' : 'bg-gray-50'
                            }`}
                            onClick={(e) => { e.stopPropagation(); !cfg.paperLocked && setCustomer(prev => ({ ...prev, innerPaper: code, innerWeight: w })); }}
                          >
                            {w}g
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* 내지 인쇄 */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {!cfg.printColorHidden && (
              <div>
                <p className="text-xs text-gray-500 mb-1">컬러</p>
                <div className="flex gap-1">
                  {cfg.color && (
                    <button 
                      disabled={cfg.printColorLocked}
                      className={`flex-1 py-1 text-xs border rounded transition-colors ${customer.innerColor === 'color' ? 'border-gray-400 bg-gray-100 text-gray-900 font-medium' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      onClick={() => !cfg.printColorLocked && setCustomer(prev => ({ ...prev, innerColor: 'color' }))}
                    >
                      컬러
                    </button>
                  )}
                  {cfg.mono && (
                    <button 
                      disabled={cfg.printColorLocked}
                      className={`flex-1 py-1 text-xs border rounded transition-colors ${customer.innerColor === 'mono' ? 'border-gray-400 bg-gray-100 text-gray-900 font-medium' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      onClick={() => !cfg.printColorLocked && setCustomer(prev => ({ ...prev, innerColor: 'mono' }))}
                    >
                      흑백
                    </button>
                  )}
                </div>
              </div>
            )}
            {!cfg.printSideHidden && (
              <div>
                <p className="text-xs text-gray-500 mb-1">면수</p>
                <div className="flex gap-1">
                  {cfg.single && (
                    <button 
                      disabled={cfg.printSideLocked}
                      className={`flex-1 py-1 text-xs border rounded transition-colors ${customer.innerSide === 'single' ? 'border-gray-400 bg-gray-100 text-gray-900 font-medium' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      onClick={() => !cfg.printSideLocked && setCustomer(prev => ({ ...prev, innerSide: 'single' }))}
                    >
                      단면
                    </button>
                  )}
                  {cfg.double && (
                    <button 
                      disabled={cfg.printSideLocked}
                      className={`flex-1 py-1 text-xs border rounded transition-colors ${customer.innerSide === 'double' ? 'border-gray-400 bg-gray-100 text-gray-900 font-medium' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      onClick={() => !cfg.printSideLocked && setCustomer(prev => ({ ...prev, innerSide: 'double' }))}
                    >
                      양면
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* 페이지 수 */}
          {!cfg.pagesHidden && (
            <div>
              <p className="text-xs text-gray-500 mb-1">페이지 수</p>
              <div className="flex items-center gap-2">
                <button 
                  disabled={cfg.pagesLocked}
                  className="w-7 h-7 border rounded flex items-center justify-center bg-white hover:bg-white"
                  onClick={() => !cfg.pagesLocked && setCustomer(prev => ({ ...prev, pages: Math.max(cfg.min, prev.pages - cfg.step) }))}
                >
                  −
                </button>
                <input 
                  type="text" 
                  value={customer.pages + 'p'}
                  readOnly
                  className="w-14 text-center border rounded py-1 text-sm bg-white"
                />
                <button 
                  disabled={cfg.pagesLocked}
                  className="w-7 h-7 border rounded flex items-center justify-center bg-white hover:bg-white"
                  onClick={() => !cfg.pagesLocked && setCustomer(prev => ({ ...prev, pages: Math.min(cfg.max, prev.pages + cfg.step) }))}
                >
                  +
                </button>
                <span className="text-xs text-gray-400">{cfg.min}~{cfg.max}p</span>
              </div>
              {block.type === 'inner_layer_saddle' && (
                <p className="text-xs text-gray-500 mt-1">내지: {Math.max(0, customer.pages - 4)}p (표지 4p 제외)</p>
              )}
            </div>
          )}
        </div>
      );
      
    case 'quantity':
      return (
        <div className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">수량</p>
          <div className="qty-table-wrapper">
            <table className="qty-table">
              <thead>
                <tr>
                  <th>수량</th>
                  <th>단가</th>
                  <th>총 가격</th>
                </tr>
              </thead>
              <tbody>
                {cfg.options?.map((q) => {
                  const p = calculatePrice(customer, q, productType) || { unitPrice: 0, total: 0 };
                  const unitPrice = p.unitPrice || p.perUnit || 0;
                  const total = p.total || 0;
                  const isSelected = customer.qty === q;
                  return (
                    <tr
                      key={q}
                      className={isSelected ? 'selected' : ''}
                      onClick={() => setCustomer(prev => ({ ...prev, qty: q }))}
                    >
                      <td>{q}부</td>
                      <td className="unit-price">1부당 {unitPrice.toLocaleString()}원</td>
                      <td>{total.toLocaleString()}원</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );

    default:
      return null;
  }
}
