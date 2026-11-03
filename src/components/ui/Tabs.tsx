import { type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ items, activeId, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 border-b border-white/10 overflow-x-auto',
        className
      )}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            'flex items-center gap-2 h-9 px-3 text-sm font-medium border-b-2 -mb-px transition-colors duration-150 whitespace-nowrap',
            activeId === item.id
              ? 'border-blue-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-100'
          )}
        >
          {item.icon}
          {item.label}
          {item.badge}
        </button>
      ))}
    </div>
  );
}
