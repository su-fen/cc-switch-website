import type { Paragraph, Parent, Root, RootContent, Text } from 'mdast';
// Type-only import: registers the `hName` / `hProperties` augmentation on mdast `Data`.
import type {} from 'mdast-util-to-hast';

const OPEN_MARKER = /^:{3,}\s*(tabs|code-tabs)(?:#(\S+))?\s*$/;
const CLOSE_MARKER = /^:{3,}\s*$/;
const TAB_MARKER = /^@tab(:active)?\s+(.+)$/;

interface TabPanel {
  label: string;
  active: boolean;
  nodes: RootContent[];
}

function getParagraphText(node: RootContent): string | null {
  if (node.type !== 'paragraph') return null;
  const paragraph = node as Paragraph;
  if (!paragraph.children.every((child) => child.type === 'text')) return null;
  return paragraph.children.map((child) => (child as Text).value).join('');
}

/**
 * 把「首行是标记、后面跟着正文」的段落拆开，
 * 容忍 `@tab xxx` 与内容之间没有空行的写法。
 */
function splitMarkerParagraphs(nodes: RootContent[]): RootContent[] {
  const result: RootContent[] = [];

  for (const node of nodes) {
    if (node.type !== 'paragraph') {
      result.push(node);
      continue;
    }

    const paragraph = node as Paragraph;
    const firstChild = paragraph.children[0];
    if (!firstChild || firstChild.type !== 'text') {
      result.push(node);
      continue;
    }

    const text = firstChild as Text;
    const newlineIndex = text.value.indexOf('\n');
    if (newlineIndex === -1) {
      result.push(node);
      continue;
    }

    const firstLine = text.value.slice(0, newlineIndex);
    if (!OPEN_MARKER.test(firstLine) && !TAB_MARKER.test(firstLine) && !CLOSE_MARKER.test(firstLine)) {
      result.push(node);
      continue;
    }

    const markerParagraph: Paragraph = {
      type: 'paragraph',
      children: [{ type: 'text', value: firstLine }],
    };
    const rest = text.value.slice(newlineIndex + 1);
    const restChildren = rest
      ? [{ type: 'text', value: rest } as Text, ...paragraph.children.slice(1)]
      : paragraph.children.slice(1);

    result.push(markerParagraph);
    if (restChildren.length > 0) {
      result.push({ type: 'paragraph', children: restChildren });
    }
  }

  return result;
}

function buildTabsNode(kind: string, groupId: string | undefined, panels: TabPanel[]): RootContent {
  const activeIndex = Math.max(
    panels.findIndex((panel) => panel.active),
    0,
  );

  const panelNodes = panels.map((panel) => ({
    type: 'blockquote',
    data: {
      hName: 'md-tab-panel',
      hProperties: { 'data-label': panel.label },
    },
    children: panel.nodes,
  }));

  const tabsNode = {
    type: 'blockquote',
    data: {
      hName: 'md-tabs',
      hProperties: {
        'data-kind': kind,
        'data-labels': JSON.stringify(panels.map((panel) => panel.label)),
        'data-active': String(activeIndex),
        ...(groupId ? { 'data-group': groupId } : {}),
      },
    },
    children: panelNodes,
  };

  return tabsNode as unknown as RootContent;
}

function transformChildren(parent: Parent): void {
  const nodes = splitMarkerParagraphs(parent.children as RootContent[]);
  const result: RootContent[] = [];
  let index = 0;

  while (index < nodes.length) {
    const node = nodes[index];
    const text = getParagraphText(node);
    const openMatch = text === null ? null : OPEN_MARKER.exec(text);

    if (!openMatch) {
      result.push(node);
      index += 1;
      continue;
    }

    // 寻找匹配的 ::: 结束标记（容忍嵌套容器）
    let depth = 1;
    let closeIndex = -1;
    for (let cursor = index + 1; cursor < nodes.length; cursor += 1) {
      const cursorText = getParagraphText(nodes[cursor]);
      if (cursorText === null) continue;
      if (OPEN_MARKER.test(cursorText)) {
        depth += 1;
      } else if (CLOSE_MARKER.test(cursorText)) {
        depth -= 1;
        if (depth === 0) {
          closeIndex = cursor;
          break;
        }
      }
    }

    if (closeIndex === -1) {
      // 没有闭合标记，原样保留
      result.push(node);
      index += 1;
      continue;
    }

    const inner = nodes.slice(index + 1, closeIndex);
    const panels: TabPanel[] = [];
    let current: TabPanel | null = null;
    let nested = 0;

    for (const innerNode of inner) {
      const innerText = getParagraphText(innerNode);

      if (innerText !== null && OPEN_MARKER.test(innerText)) nested += 1;
      else if (innerText !== null && CLOSE_MARKER.test(innerText)) nested -= 1;

      const tabMatch = innerText !== null && nested === 0 ? TAB_MARKER.exec(innerText) : null;
      if (tabMatch) {
        current = { label: tabMatch[2].trim(), active: Boolean(tabMatch[1]), nodes: [] };
        panels.push(current);
        continue;
      }

      if (current) {
        current.nodes.push(innerNode);
      }
      // @tab 之前的内容被忽略（与 theme-hope 行为一致）
    }

    if (panels.length === 0) {
      // 容器里没有任何 @tab，跳过转换
      result.push(...inner);
      index = closeIndex + 1;
      continue;
    }

    // 递归处理面板内容，支持容器嵌套
    for (const panel of panels) {
      const fakeParent: Parent = { type: 'root', children: panel.nodes } as Parent;
      transformChildren(fakeParent);
      panel.nodes = fakeParent.children as RootContent[];
    }

    result.push(buildTabsNode(openMatch[1], openMatch[2], panels));
    index = closeIndex + 1;
  }

  parent.children = result;
}

/**
 * 选项卡容器语法（参考 vuepress-theme-hope）：
 *
 * ::: tabs                ::: code-tabs#shell
 * @tab 标签A              @tab pnpm
 * 任意 Markdown 内容      ```bash …```
 * @tab:active 标签B       @tab npm
 * …                       ```bash …```
 * :::                     :::
 *
 * `#id` 用于让页面上多组选项卡联动，`@tab:active` 指定默认选中项。
 * 转换为 <md-tabs data-kind="tabs|code-tabs"> / <md-tab-panel>，由 MdTabs 组件渲染。
 */
export function remarkTabs() {
  return (tree: Root) => {
    transformChildren(tree);
  };
}
