import type { ReactNode } from 'react';
import { HelpCircle, Palette, Puzzle, Rocket, Server, Users, FileText } from 'lucide-react';
import type { Language } from '@/i18n/translations';
import menuConfig from '../../../docs/menu.json';

/** docs/menu.json 的结构定义 */
export interface DocMenuTitle {
  zh: string;
  en?: string;
  ja?: string;
}

export interface DocMenuItem {
  id: string;
  title: DocMenuTitle;
  /** 相对 docs/{lang}/ 的 Markdown 文件路径 */
  doc?: string;
  /** 子菜单，支持任意层级嵌套 */
  items?: DocMenuItem[];
}

export interface DocMenuSection extends DocMenuItem {
  icon?: string;
  /** 点击分组标题时默认展示的子项 id（缺省为第一个有文档的子项） */
  defaultItem?: string;
}

export interface DocMenuConfig {
  editBaseUrl?: string;
  sections: DocMenuSection[];
}

export const docMenu = menuConfig as DocMenuConfig;

/** 运行时使用的导航节点（标题已本地化、icon 已实例化） */
export interface DocNavItem {
  id: string;
  /** 从 section 往下用 / 连接的完整路径，作为 URL 中的 item 参数 */
  path: string;
  title: string;
  doc?: string;
  items?: DocNavItem[];
}

export interface DocSection {
  id: string;
  title: string;
  icon?: ReactNode;
  doc?: string;
  defaultItem?: string;
  items?: DocNavItem[];
}

const ICON_MAP: Record<string, ReactNode> = {
  rocket: <Rocket className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  puzzle: <Puzzle className="w-4 h-4" />,
  server: <Server className="w-4 h-4" />,
  'help-circle': <HelpCircle className="w-4 h-4" />,
  palette: <Palette className="w-4 h-4" />,
  'file-text': <FileText className="w-4 h-4" />,
};

function localizeTitle(title: DocMenuTitle, language: Language): string {
  return title[language] ?? title.zh;
}

function toNavItems(items: DocMenuItem[] | undefined, language: Language, parentPath: string): DocNavItem[] | undefined {
  if (!items || items.length === 0) return undefined;

  return items.map((item) => {
    const path = parentPath ? `${parentPath}/${item.id}` : item.id;
    return {
      id: item.id,
      path,
      title: localizeTitle(item.title, language),
      doc: item.doc,
      items: toNavItems(item.items, language, path),
    };
  });
}

const sectionsCache = new Map<Language, DocSection[]>();

export function getDocSections(language: Language): DocSection[] {
  const cached = sectionsCache.get(language);
  if (cached) return cached;

  const sections = docMenu.sections.map((section) => ({
    id: section.id,
    title: localizeTitle(section.title, language),
    icon: section.icon ? ICON_MAP[section.icon] : undefined,
    doc: section.doc,
    defaultItem: section.defaultItem,
    items: toNavItems(section.items, language, ''),
  }));

  sectionsCache.set(language, sections);
  return sections;
}

export interface FlattenedDocNavItem {
  sectionId: string;
  /** 为空表示 section 本身（展示默认文档） */
  itemPath?: string;
  title: string;
  sectionTitle: string;
  doc?: string;
}

/** 深度优先展平导航树，用于上一页/下一页、搜索和站点地图 */
export function flattenDocSections(sections: DocSection[]): FlattenedDocNavItem[] {
  const result: FlattenedDocNavItem[] = [];

  const walk = (sectionId: string, sectionTitle: string, items: DocNavItem[] | undefined) => {
    items?.forEach((item) => {
      if (item.doc) {
        result.push({ sectionId, itemPath: item.path, title: item.title, sectionTitle, doc: item.doc });
      }
      walk(sectionId, sectionTitle, item.items);
    });
  };

  sections.forEach((section) => {
    result.push({ sectionId: section.id, title: section.title, sectionTitle: section.title, doc: section.doc });
    walk(section.id, section.title, section.items);
  });

  return result;
}

/** 按 path（如 "advanced/nested-menu"）在 section 内查找导航节点 */
export function findDocNavItem(section: DocSection, itemPath: string): DocNavItem | undefined {
  const walk = (items: DocNavItem[] | undefined): DocNavItem | undefined => {
    if (!items) return undefined;
    for (const item of items) {
      if (item.path === itemPath) return item;
      if (itemPath.startsWith(`${item.path}/`)) {
        const found = walk(item.items);
        if (found) return found;
      }
    }
    return undefined;
  };

  return walk(section.items);
}
