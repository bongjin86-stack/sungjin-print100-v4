// Category Types
export interface Category {
  id: string;
  title: string;
}

export interface CategoryData {
  work: Category[];
  news: Category[];
}

// Menu Types
export interface MenuItem {
  title: string;
  path: string;
  children?: MenuItem[];
}

export interface MenuData {
  main: MenuItem[];
  contact: {
    title: string;
    path: string;
  };
  footer: FooterMenuSection[];
}

export interface FooterMenuSection {
  name: string;
  menus: Array<{
    title: string;
    path: string;
  }>;
}

// Social Media Types
export interface SocialMedia {
  icon: string;
  label: string;
  url: string;
}

// Site Config Types
export interface SiteConfig {
  site: {
    [key: string]: string | number | boolean | string[];
  };
  settings: {
    [key: string]: string | number | boolean | string[];
  };
  google: {
    [key: string]: string | number | boolean | string[];
  };
  company: {
    postal_code: string;
    address: string;
    tel: string;
    email: string;
    ceo_name: string;
    ceo_title: string;
    established: string;
    capital: string;
    employees: string;
    business_hours: string;
    business_hours_note: string;
  };
  [key: string]: {
    [key: string]: string | number | boolean | string[];
  };
}

// Team Member Types
export interface TeamMember {
  name: string;
  position: string;
  imagePath: string;
  isPet?: boolean;
}

// FAQ Types
export interface FAQItem {
  question: string;
  answer: string;
}

// History Types
export interface HistoryItem {
  year: string;
  month: string;
  event: string;
}

// Values Types
export interface ValueItem {
  title: string;
  description: string;
}

// Service Types
export interface Service {
  id: string;
  title: string;
  description: string;
  detailDescription: string;
  tasks: string[];
  image: ImageMetadata;
}

// Partner Types
export interface Partner {
  name: string;
  logo: string;
  url: string;
}
