import type { ReactNode } from 'react';
import { Info, Lightbulb, MessageSquareWarning, AlertTriangle, OctagonAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/useLanguage';
import type { Language } from '@/i18n/translations';
import type { GfmAlertType } from '../remark-gfm-alerts';

interface GfmAlertProps {
  'data-type'?: string;
  children?: ReactNode;
}

const ALERT_CONFIG: Record<
  GfmAlertType,
  {
    icon: typeof Info;
    title: Record<Language, string>;
    container: string;
    heading: string;
  }
> = {
  note: {
    icon: Info,
    title: { zh: '备注', en: 'Note', ja: 'メモ' },
    container: 'border-blue-500/60 bg-blue-500/5',
    heading: 'text-blue-600 dark:text-blue-400',
  },
  tip: {
    icon: Lightbulb,
    title: { zh: '提示', en: 'Tip', ja: 'ヒント' },
    container: 'border-emerald-500/60 bg-emerald-500/5',
    heading: 'text-emerald-600 dark:text-emerald-400',
  },
  important: {
    icon: MessageSquareWarning,
    title: { zh: '重要', en: 'Important', ja: '重要' },
    container: 'border-violet-500/60 bg-violet-500/5',
    heading: 'text-violet-600 dark:text-violet-400',
  },
  warning: {
    icon: AlertTriangle,
    title: { zh: '警告', en: 'Warning', ja: '警告' },
    container: 'border-amber-500/60 bg-amber-500/5',
    heading: 'text-amber-600 dark:text-amber-400',
  },
  caution: {
    icon: OctagonAlert,
    title: { zh: '危险', en: 'Caution', ja: '注意' },
    container: 'border-red-500/60 bg-red-500/5',
    heading: 'text-red-600 dark:text-red-400',
  },
};

export function GfmAlert({ 'data-type': dataType, children }: GfmAlertProps) {
  const { language } = useLanguage();
  const type = (dataType && dataType in ALERT_CONFIG ? dataType : 'note') as GfmAlertType;
  const config = ALERT_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className={cn('my-4 rounded-r-lg border-l-4 py-3 pl-4 pr-4 [&>p]:mb-2 [&>p:last-child]:mb-0', config.container)}>
      <div className={cn('mb-2 flex items-center gap-2 font-semibold', config.heading)}>
        <Icon className="h-4 w-4 shrink-0" />
        {config.title[language]}
      </div>
      {children}
    </div>
  );
}
