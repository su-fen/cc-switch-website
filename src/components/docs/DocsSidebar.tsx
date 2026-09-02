import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocNavItem, DocSection } from '@/content/docs/navigation';

interface DocsSidebarProps {
  sections: DocSection[];
  activeSection: string;
  activeItem?: string;
  onNavigate: (sectionId: string, itemId?: string) => void;
}

/** 收集 activeItem 所有祖先分组的展开 key（sectionId + ":" + path） */
function collectExpandedKeys(sections: DocSection[], activeSection: string, activeItem?: string): string[] {
  const keys = [activeSection];
  if (!activeItem) return keys;

  const segments = activeItem.split('/');
  let path = '';
  for (const segment of segments.slice(0, -1)) {
    path = path ? `${path}/${segment}` : segment;
    keys.push(`${activeSection}:${path}`);
  }
  return keys;
}

interface NavItemsProps {
  sectionId: string;
  items: DocNavItem[];
  depth: number;
  activeSection: string;
  activeItem?: string;
  expanded: string[];
  onToggle: (key: string) => void;
  onNavigate: (sectionId: string, itemId?: string) => void;
}

function NavItems({ sectionId, items, depth, activeSection, activeItem, expanded, onToggle, onNavigate }: NavItemsProps) {
  return (
    <div className={cn('space-y-0.5', depth === 0 ? 'ml-6 mt-1 border-l border-border pl-3' : 'ml-3 mt-0.5 border-l border-border pl-3')}>
      {items.map((item) => {
        const hasChildren = !!item.items?.length;
        const key = `${sectionId}:${item.path}`;
        const isExpanded = expanded.includes(key);
        const isActive = activeSection === sectionId && activeItem === item.path;

        return (
          <div key={item.path}>
            <button
              onClick={() => {
                if (hasChildren) onToggle(key);
                if (item.doc) onNavigate(sectionId, item.path);
              }}
              className={cn(
                'w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span className="flex-1">{item.title}</span>
              {hasChildren && (
                <motion.span animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </motion.span>
              )}
            </button>

            <AnimatePresence>
              {hasChildren && isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <NavItems
                    sectionId={sectionId}
                    items={item.items!}
                    depth={depth + 1}
                    activeSection={activeSection}
                    activeItem={activeItem}
                    expanded={expanded}
                    onToggle={onToggle}
                    onNavigate={onNavigate}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export function DocsSidebar({ sections, activeSection, activeItem, onNavigate }: DocsSidebarProps) {
  const [expanded, setExpanded] = useState<string[]>(() => collectExpandedKeys(sections, activeSection, activeItem));

  // 当前文档变化时自动展开其祖先层级
  useEffect(() => {
    setExpanded((prev) => {
      const required = collectExpandedKeys(sections, activeSection, activeItem);
      const missing = required.filter((key) => !prev.includes(key));
      return missing.length > 0 ? [...prev, ...missing] : prev;
    });
  }, [sections, activeSection, activeItem]);

  const toggle = (key: string) => {
    setExpanded((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  return (
    <aside className="w-64 lg:w-72 shrink-0">
      <nav className="sticky top-24 space-y-1">
        {sections.map((section) => {
          const isExpanded = expanded.includes(section.id);
          const isActive = activeSection === section.id;
          const hasItems = section.items && section.items.length > 0;

          return (
            <div key={section.id}>
              <button
                onClick={() => {
                  toggle(section.id);
                  onNavigate(section.id);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200',
                  isActive && !activeItem
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {section.icon && (
                  <span className="text-primary/70">{section.icon}</span>
                )}
                <span className="flex-1 text-sm">{section.title}</span>
                {hasItems && (
                  <motion.span
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.span>
                )}
              </button>

              <AnimatePresence>
                {hasItems && isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <NavItems
                      sectionId={section.id}
                      items={section.items!}
                      depth={0}
                      activeSection={activeSection}
                      activeItem={activeItem}
                      expanded={expanded}
                      onToggle={toggle}
                      onNavigate={onNavigate}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
