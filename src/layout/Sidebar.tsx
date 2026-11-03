import { useState, useMemo } from 'react';
import {
  Menu,
  X,
  Search,
  ChevronLeft,
  LogOut,
  Store,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { navSections, type NavItem } from './navConfig';
import type { Rol } from '@/types';

interface SidebarProps {
  activeId: string;
  onNavigate: (id: string) => void;
  userRol: Rol;
  userName: string;
  pdvNombre: string;
  onLogout: () => void;
}

export function Sidebar({
  activeId,
  onNavigate,
  userRol,
  userName,
  pdvNombre,
  onLogout,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredSections = useMemo(() => {
    if (!search.trim()) {
      return navSections
        .map((sec) => ({
          ...sec,
          items: sec.items.filter(
            (item) => !item.roles || item.roles.includes(userRol)
          ),
        }))
        .filter((sec) => sec.items.length > 0);
    }
    const q = search.toLowerCase();
    return navSections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter(
          (item) =>
            (!item.roles || item.roles.includes(userRol)) &&
            item.label.toLowerCase().includes(q)
        ),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [search, userRol]);

  const handleNavigate = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const widthClass = collapsed ? 'w-16' : 'w-64';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className={cn('flex items-center h-14 border-b border-white/10 px-3 shrink-0', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-semibold text-white truncate">TodoenTalla</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex text-slate-500 hover:text-slate-100 transition-colors duration-150 p-1"
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          <ChevronLeft className={cn('w-5 h-5 transition-transform duration-150', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar menú..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 rounded-lg bg-slate-900 border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 pl-9 pr-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-150"
            />
          </div>
        </div>
      )}

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {filteredSections.map((section) => (
          <div key={section.id}>
            {!collapsed && (
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider px-3 mb-1.5">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item: NavItem) => {
                const active = activeId === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'w-full flex items-center h-9 rounded-lg px-3 gap-3 text-sm font-medium transition-colors duration-150',
                      collapsed && 'justify-center px-0',
                      active
                        ? 'bg-white/5 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3 shrink-0 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-sm font-semibold text-slate-300 shrink-0">
              {userName.charAt(0)}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-medium text-slate-100 truncate">{userName}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{userRol}</p>
            </div>
            <button
              onClick={onLogout}
              className="text-slate-500 hover:text-red-400 transition-colors duration-150 p-1"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
        {!collapsed && (
          <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
            <Store className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{pdvNombre}</span>
          </div>
        )}
        {collapsed && (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center h-9 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors duration-150"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-30 w-10 h-10 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors duration-150"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed left-0 top-0 bottom-0 w-64 z-50 animate-slide-in-right">
          {sidebarContent}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex fixed left-0 top-0 bottom-0 z-20 border-r border-white/10 transition-all duration-200',
          widthClass
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export { X as SidebarCloseIcon };
