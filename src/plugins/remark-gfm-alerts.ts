import type { Blockquote, Paragraph, Root, Text } from 'mdast';
import { visit } from 'unist-util-visit';
// Type-only import: registers the `hName` / `hProperties` augmentation on mdast `Data`.
import type {} from 'mdast-util-to-hast';

export const GFM_ALERT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'] as const;

export type GfmAlertType = (typeof GFM_ALERT_TYPES)[number];

const ALERT_MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(\n|$)/i;

/**
 * GFM 警告（Alerts）语法支持：
 *
 * > [!NOTE]
 * > 内容……
 *
 * 支持 NOTE / TIP / IMPORTANT / WARNING / CAUTION 五种类型，
 * 转换为 <gfm-alert data-type="note"> 自定义元素，由 GfmAlert 组件渲染。
 */
export function remarkGfmAlerts() {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote) => {
      const firstChild = node.children[0];
      if (!firstChild || firstChild.type !== 'paragraph') return;

      const paragraph = firstChild as Paragraph;
      const firstText = paragraph.children[0];
      if (!firstText || firstText.type !== 'text') return;

      const match = ALERT_MARKER.exec((firstText as Text).value);
      if (!match) return;

      const type = match[1].toLowerCase() as GfmAlertType;

      // 去掉 [!TYPE] 标记（以及紧随其后的换行）
      const rest = (firstText as Text).value.slice(match[0].length);
      if (rest) {
        firstText.value = rest;
      } else {
        paragraph.children.shift();
        if (paragraph.children.length === 0) {
          node.children.shift();
        }
      }

      node.data = {
        ...node.data,
        hName: 'gfm-alert',
        hProperties: { 'data-type': type },
      };
    });
  };
}
