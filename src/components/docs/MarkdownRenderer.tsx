import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn, slugify } from '@/lib/utils';
import {
  remarkGfmAlerts,
  remarkTabs,
  GfmAlert,
  MdTabs,
  MdTabPanel,
  MdImage,
  CodeBlock,
  parseCodeMeta,
} from '@/plugins';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// gfm-alert / md-tabs / md-tab-panel 是 remark 插件生成的自定义元素，
// react-markdown 在运行时按标签名查找组件，这里通过断言扩展 Components 类型。
const customComponents = {
  'gfm-alert': GfmAlert,
  'md-tabs': MdTabs,
  'md-tab-panel': MdTabPanel,
} as unknown as Components;

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('prose-docs max-w-full [overflow-wrap:anywhere]', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkGfmAlerts, remarkTabs]}
        components={{
          ...customComponents,
          h1: ({ children }) => {
            const id = slugify(String(children));
            return (
              <h1 id={id} className="mb-6 mt-8 scroll-mt-24 border-b border-border pb-4 text-3xl font-bold text-foreground first:mt-0 md:text-4xl">
                {children}
              </h1>
            );
          },
          h2: ({ children }) => {
            const id = slugify(String(children));
            return (
              <h2 id={id} className="mb-4 mt-10 scroll-mt-24 text-2xl font-semibold text-foreground md:text-3xl">
                {children}
              </h2>
            );
          },
          h3: ({ children }) => {
            const id = slugify(String(children));
            return (
              <h3 id={id} className="mb-3 mt-8 scroll-mt-24 text-xl font-semibold text-foreground md:text-2xl">
                {children}
              </h3>
            );
          },
          h4: ({ children }) => {
            const id = slugify(String(children));
            return (
              <h4 id={id} className="text-lg font-semibold text-foreground mb-2 mt-6 scroll-mt-24">
                {children}
              </h4>
            );
          },
          p: ({ children }) => (
            <p className="mb-4 leading-7 text-muted-foreground">
              {children}
            </p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 ml-5 list-outside list-disc space-y-2 text-muted-foreground sm:ml-6">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-5 list-outside list-decimal space-y-2 text-muted-foreground sm:ml-6">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-7">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/50 pl-4 py-2 my-4 bg-muted/30 rounded-r-lg text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ node, className, children, ...props }) => {
            const isBlock = className?.includes('language-');
            const codeString = String(children).replace(/\n$/, '');

            if (isBlock) {
              // 代码围栏的 meta（如 title="config.ts"）由 mdast-util-to-hast 挂在 node.data.meta 上
              const meta = (node?.data as { meta?: string } | undefined)?.meta;
              const { title } = parseCodeMeta(meta);
              return <CodeBlock className={className} title={title}>{codeString}</CodeBlock>;
            }

            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary break-all" {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => {
            // Just pass through - the code component handles the pre styling
            return <>{children}</>;
          },
          table: ({ children }) => (
            <div className="mb-6 max-w-full overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-max border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-border px-3 py-3 text-left font-semibold text-foreground sm:px-4">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border px-3 py-3 text-muted-foreground sm:px-4">
              {children}
            </td>
          ),
          hr: () => (
            <hr className="border-border my-8" />
          ),
          img: ({ src, alt, title }) => (
            <MdImage src={typeof src === 'string' ? src : undefined} alt={alt} title={title ?? undefined} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
