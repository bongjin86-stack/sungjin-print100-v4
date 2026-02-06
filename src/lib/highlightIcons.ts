import type { LucideIcon } from 'lucide-react';
import {
  Award,
  BookOpen,
  CircleDollarSign,
  Clock,
  FileText,
  Link2,
  Package,
  Palette,
  Paperclip,
  Printer,
  Shield,
  Sparkles,
  Star,
  Truck,
  Zap,
} from 'lucide-react';

export interface IconEntry {
  component: LucideIcon;
  label: string;
}

export interface IconListItem {
  id: string;
  label: string;
  Component: LucideIcon;
}

export const ICON_MAP: Record<string, IconEntry> = {
  Printer: { component: Printer, label: '인쇄' },
  Truck: { component: Truck, label: '배송' },
  BookOpen: { component: BookOpen, label: '제본' },
  Sparkles: { component: Sparkles, label: '마감' },
  Paperclip: { component: Paperclip, label: '클립' },
  Shield: { component: Shield, label: '내구성' },
  Link2: { component: Link2, label: '연결' },
  CircleDollarSign: { component: CircleDollarSign, label: '경제적' },
  Clock: { component: Clock, label: '시간' },
  Palette: { component: Palette, label: '컬러' },
  FileText: { component: FileText, label: '문서' },
  Star: { component: Star, label: '특징' },
  Zap: { component: Zap, label: '빠른' },
  Award: { component: Award, label: '품질' },
  Package: { component: Package, label: '포장' },
};

export const ICON_LIST: IconListItem[] = Object.entries(ICON_MAP).map(
  ([key, val]) => ({
    id: key,
    label: val.label,
    Component: val.component,
  })
);

export function getIconComponent(iconName: string): LucideIcon {
  return ICON_MAP[iconName]?.component || FileText;
}
