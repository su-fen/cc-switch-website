import { Children, isValidElement, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** 同一 data-group 的多组选项卡联动（例如页面上所有 pnpm/npm 代码组一起切换） */
const groupListeners = new Map<string, Set<(label: string) => void>>();

function broadcast(group: string, label: string) {
  groupListeners.get(group)?.forEach((listener) => listener(label));
}

function subscribe(group: string, listener: (label: string) => void) {
  let listeners = groupListeners.get(group);
  if (!listeners) {
    listeners = new Set();
    groupListeners.set(group, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) groupListeners.delete(group);
  };
}

interface MdTabsProps {
  'data-kind'?: string;
  'data-labels'?: string;
  'data-active'?: string;
  'data-group'?: string;
  children?: ReactNode;
}

export function MdTabs({
  'data-kind': kind = 'tabs',
  'data-labels': labelsJson,
  'data-active': defaultActive,
  'data-group': group,
  children,
}: MdTabsProps) {
  const labels = useMemo<string[]>(() => {
    try {
      const parsed: unknown = JSON.parse(labelsJson ?? '[]');
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }, [labelsJson]);

  const [activeIndex, setActiveIndex] = useState(() => {
    const initial = Number(defaultActive ?? '0');
    return Number.isFinite(initial) ? initial : 0;
  });

  useEffect(() => {
    if (!group) return;
    return subscribe(group, (label) => {
      const index = labels.indexOf(label);
      if (index >= 0) setActiveIndex(index);
    });
  }, [group, labels]);

  const handleSelect = (index: number) => {
    setActiveIndex(index);
    if (group) broadcast(group, labels[index]);
  };

  const panels = Children.toArray(children).filter(isValidElement);
  const isCode = kind === 'code-tabs';

  return (
    <div className={cn('my-4', !isCode && 'overflow-hidden rounded-xl border border-border')}>
      <div
        role="tablist"
        className={cn(
          'flex flex-wrap items-center gap-1',
          isCode ? 'mb-2' : 'border-b border-border bg-muted/40 px-2 py-1.5',
        )}
      >
        {labels.map((label, index) => (
          <button
            key={label}
            role="tab"
            aria-selected={index === activeIndex}
            onClick={() => handleSelect(index)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm transition-colors',
              index === activeIndex
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {panels.map((panel, index) => (
        <div
          key={index}
          role="tabpanel"
          hidden={index !== activeIndex}
          className={cn(!isCode && 'p-4 [&>*:last-child]:mb-0', isCode && '[&_.group]:my-0')}
        >
          {panel}
        </div>
      ))}
    </div>
  );
}

interface MdTabPanelProps {
  children?: ReactNode;
}

/** <md-tab-panel> 的直通容器，实际切换逻辑在 MdTabs 中 */
export function MdTabPanel({ children }: MdTabPanelProps) {
  return <>{children}</>;
}
