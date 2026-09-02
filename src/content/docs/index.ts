import type { Language } from '@/i18n/translations';
import { docMenu, type DocMenuItem, type DocMenuSection } from './navigation';

// 从项目根目录 docs/{zh,en,ja}/ 打包加载 Markdown（懒加载，按需拆分 chunk）
const docModules = import.meta.glob('/docs/{zh,en,ja}/**/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

// Cache for loaded documents
const docCache: Record<string, string> = {};

const docMessages: Record<Language, { notFound: string; loadFailed: string }> = {
  zh: {
    notFound: '# 页面未找到\n\n请求的文档页面不存在。',
    loadFailed: '# 加载失败\n\n无法加载文档内容，请稍后重试。',
  },
  en: {
    notFound: '# Page Not Found\n\nThe requested documentation page does not exist.',
    loadFailed: '# Load Failed\n\nUnable to load the documentation. Please try again later.',
  },
  ja: {
    notFound: '# ページが見つかりません\n\n要求されたドキュメントページは存在しません。',
    loadFailed: '# 読み込み失敗\n\nドキュメントを読み込めませんでした。しばらくしてからもう一度お試しください。',
  },
};

interface DocRoute {
  sectionId: string;
  itemPath: string;
}

/** 文档相对路径 -> 路由（用于把 Markdown 里的相对链接重写为 ?section=&item=） */
const docRouteByPath = new Map<string, DocRoute>();
/** sectionId -> (itemPath -> 文档相对路径) */
const docPathBySection = new Map<string, Map<string, string>>();
/** sectionId -> 默认文档相对路径 */
const sectionDefaultDoc = new Map<string, string>();

function registerItems(sectionId: string, items: DocMenuItem[] | undefined, parentPath: string) {
  items?.forEach((item) => {
    const path = parentPath ? `${parentPath}/${item.id}` : item.id;
    if (item.doc) {
      docPathBySection.get(sectionId)?.set(path, item.doc);
      if (!docRouteByPath.has(item.doc)) {
        docRouteByPath.set(item.doc, { sectionId, itemPath: path });
      }
    }
    registerItems(sectionId, item.items, path);
  });
}

function firstDoc(items: DocMenuItem[] | undefined): string | undefined {
  if (!items) return undefined;
  for (const item of items) {
    if (item.doc) return item.doc;
    const nested = firstDoc(item.items);
    if (nested) return nested;
  }
  return undefined;
}

function resolveSectionDefault(section: DocMenuSection): string | undefined {
  if (section.doc) return section.doc;
  if (section.defaultItem) {
    const explicit = section.items?.find((item) => item.id === section.defaultItem)?.doc;
    if (explicit) return explicit;
  }
  return firstDoc(section.items);
}

for (const section of docMenu.sections) {
  docPathBySection.set(section.id, new Map());
  registerItems(section.id, section.items, '');
  const defaultDoc = resolveSectionDefault(section);
  if (defaultDoc) sectionDefaultDoc.set(section.id, defaultDoc);
}

function getDocRelativePath(sectionId: string, itemPath?: string): string | null {
  const sectionDocs = docPathBySection.get(sectionId);
  if (!sectionDocs) return null;

  if (itemPath) {
    const doc = sectionDocs.get(itemPath);
    if (doc) return doc;
  }

  return sectionDefaultDoc.get(sectionId) ?? null;
}

/** GitHub 「编辑此页」链接 */
export function getDocEditUrl(language: Language, sectionId: string, itemPath?: string): string | null {
  const relativePath = getDocRelativePath(sectionId, itemPath);
  if (!relativePath || !docMenu.editBaseUrl) return null;

  return `${docMenu.editBaseUrl}/docs/${language}/${relativePath}`;
}

function resolveDocLink(currentRelativePath: string, href: string) {
  const [rawPath, hash = ''] = href.split('#');
  const resolvedPath = new URL(rawPath, `https://ccswitch.local/${currentRelativePath}`).pathname.replace(/^\//, '');
  const route = docRouteByPath.get(resolvedPath);

  if (!route) return href;

  const query = `?section=${encodeURIComponent(route.sectionId)}&item=${encodeURIComponent(route.itemPath)}`;
  return hash ? `${query}#${hash}` : query;
}

function processDocContent(content: string, currentRelativePath: string) {
  return content
    .replace(
      /!\[([^\]]*)\]\(\.\.\/(?:\.\.\/)?assets\/([^)]+)\)/g,
      '![$1](/docs/assets/$2)'
    )
    .replace(
      /\]\(\.\.\/\.\.\/\.\.\/release-notes\/([^)]+)\)/g,
      '](/docs/release-notes/$1)'
    )
    .replace(
      /\]\(((?!https?:\/\/|mailto:|#|\/|\?)[^)]+\.md(?:#[^)]+)?)\)/g,
      (_, href: string) => `](${resolveDocLink(currentRelativePath, href)})`
    );
}

export async function fetchDocContent(language: Language, sectionId: string, itemPath?: string): Promise<string> {
  const relativePath = getDocRelativePath(sectionId, itemPath);

  if (!relativePath) {
    return docMessages[language].notFound;
  }

  const cacheKey = `${language}-${relativePath}`;
  if (docCache[cacheKey]) {
    return docCache[cacheKey];
  }

  // 缺少对应语言的翻译时回退到中文原文
  const loader = docModules[`/docs/${language}/${relativePath}`] ?? docModules[`/docs/zh/${relativePath}`];
  if (!loader) {
    return docMessages[language].notFound;
  }

  try {
    const content = await loader();
    const processedContent = processDocContent(content, relativePath);

    docCache[cacheKey] = processedContent;

    return processedContent;
  } catch (error) {
    console.error('Failed to load document:', error);
    return docMessages[language].loadFailed;
  }
}
