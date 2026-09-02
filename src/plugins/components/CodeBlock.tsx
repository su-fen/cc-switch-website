import { useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type PrismModule = typeof import('prismjs');

const normalizePrismLanguage = (language: string) => {
  const normalized = language.toLowerCase();

  if (normalized === 'js') return 'javascript';
  if (normalized === 'ts') return 'typescript';
  if (['shell', 'sh', 'zsh', 'terminal'].includes(normalized)) return 'bash';
  if (normalized === 'py') return 'python';

  return normalized;
};

let prismPromise: Promise<PrismModule> | null = null;
const prismLanguagePromises = new Map<string, Promise<unknown>>();

const loadPrismCore = () => {
  prismPromise ??= import('prismjs');
  return prismPromise;
};

const prismLanguageLoaders: Record<string, () => Promise<unknown>> = {
  javascript: () => import('prismjs/components/prism-javascript'),
  typescript: async () => {
    await loadPrismLanguage('javascript');
    return import('prismjs/components/prism-typescript');
  },
  jsx: async () => {
    await loadPrismLanguage('javascript');
    return import('prismjs/components/prism-jsx');
  },
  tsx: async () => {
    await loadPrismLanguage('jsx');
    await loadPrismLanguage('typescript');
    return import('prismjs/components/prism-tsx');
  },
  bash: () => import('prismjs/components/prism-bash'),
  json: () => import('prismjs/components/prism-json'),
  css: () => import('prismjs/components/prism-css'),
  sql: () => import('prismjs/components/prism-sql'),
  python: () => import('prismjs/components/prism-python'),
  lua: () => import('prismjs/components/prism-lua'),
  yaml: () => import('prismjs/components/prism-yaml'),
  markdown: () => import('prismjs/components/prism-markdown'),
};

async function loadPrismLanguage(language: string) {
  await loadPrismCore();

  const normalized = normalizePrismLanguage(language);
  const loader = prismLanguageLoaders[normalized];

  if (!loader) return;

  if (!prismLanguagePromises.has(normalized)) {
    prismLanguagePromises.set(normalized, loader());
  }

  await prismLanguagePromises.get(normalized);
}

async function loadPrism(language: string) {
  const prism = await loadPrismCore();
  await loadPrismLanguage(language);
  return prism;
}

interface CodeBlockProps {
  className?: string;
  children: string;
  title?: string;
}

export function CodeBlock({ className, children, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  // Extract language from className (e.g., "language-javascript")
  const language = className?.replace('language-', '') || 'text';

  useEffect(() => {
    let isActive = true;
    const codeElement = codeRef.current;

    if (!codeElement) return;

    loadPrism(language)
      .then((Prism) => {
        if (isActive) {
          Prism.highlightElement(codeElement);
        }
      })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) {
          console.warn('Failed to load Prism language:', language, error);
        }
      });

    return () => {
      isActive = false;
    };
  }, [children, language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-4 max-w-full">
      {title && (
        <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-border bg-muted/60 px-4 py-2">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground/60">{language}</span>
        </div>
      )}
      <div className={cn('absolute right-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100', title ? 'top-12' : 'top-2')}>
        <button
          onClick={handleCopy}
          className="p-2 rounded-lg bg-muted/80 hover:bg-muted border border-border/50 transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
      {!title && (
        <div className="absolute left-3 top-2 text-xs text-muted-foreground/60 uppercase tracking-wider">
          {language}
        </div>
      )}
      <pre
        className={cn(
          'max-w-full overflow-x-auto border border-border bg-card px-4 pb-4 text-sm',
          title ? 'rounded-b-xl pt-4' : 'rounded-xl pt-10',
        )}
      >
        <code ref={codeRef} className={`language-${language}`}>
          {children}
        </code>
      </pre>
    </div>
  );
}
