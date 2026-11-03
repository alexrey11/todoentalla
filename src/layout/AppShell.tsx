import { type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface AppShellProps {
  sidebar: ReactNode;
  sidebarWidth: string;
  children: ReactNode;
}

export function AppShell({ sidebar, sidebarWidth, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-950">
      {sidebar}
      <div
        className={cn(
          'min-h-screen transition-all duration-200',
          sidebarWidth === 'w-16' && 'lg:pl-16',
          sidebarWidth === 'w-64' && 'lg:pl-64'
        )}
      >
        <main className="p-4 md:p-6 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
