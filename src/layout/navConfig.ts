import type { LucideIcon } from 'lucide-react';
import {
  ShoppingCart,
  LayoutDashboard,
  History,
  Wallet,
  FolderTree,
  Users,
  Truck,
  PackagePlus,
  FileBarChart,
  FileText,
  Tags,
  ClipboardCheck,
  RotateCcw,
  Percent,
  ArrowLeftRight,
  ArrowRightLeft,
  Receipt,
  DollarSign,
  UserCog,
  Store,
  ShieldCheck,
  Settings,
  BookOpen,
  Database,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  roles?: ('admin' | 'jefe' | 'vendedor')[];
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    id: 'principal',
    label: 'Principal',
    items: [
      { id: 'nueva-venta', label: 'Nueva Venta', icon: ShoppingCart },
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'historial', label: 'Historial de Ventas', icon: History },
      { id: 'cierre', label: 'Cierre de Caja', icon: Wallet },
    ],
  },
  {
    id: 'catalogo',
    label: 'Catálogo',
    items: [
      { id: 'categorias', label: 'Categorías', icon: FolderTree },
      { id: 'clientes', label: 'Clientes', icon: Users },
      { id: 'proveedores', label: 'Proveedores', icon: Truck },
      { id: 'compras', label: 'Compras', icon: PackagePlus },
    ],
  },
  {
    id: 'inventario',
    label: 'Inventario',
    items: [
      { id: 'movimientos', label: 'Movimientos', icon: ArrowLeftRight },
      { id: 'transferencias', label: 'Transferencias', icon: ArrowRightLeft },
      { id: 'etiquetas', label: 'Etiquetas', icon: Tags },
      { id: 'conteo', label: 'Conteo Físico', icon: ClipboardCheck },
      { id: 'devoluciones', label: 'Devoluciones', icon: RotateCcw },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    items: [
      { id: 'gastos', label: 'Gastos', icon: Receipt },
      { id: 'tasas', label: 'Tasas de Cambio', icon: DollarSign },
      { id: 'reportes', label: 'Reportes', icon: FileBarChart },
      { id: 'cotizaciones', label: 'Cotizaciones', icon: FileText },
      { id: 'comisiones', label: 'Comisiones', icon: Percent },
    ],
  },
  {
    id: 'administracion',
    label: 'Administración',
    items: [
      { id: 'usuarios', label: 'Usuarios', icon: UserCog, roles: ['admin', 'jefe'] },
      { id: 'puntos-venta', label: 'Puntos de Venta', icon: Store, roles: ['admin', 'jefe'] },
      { id: 'seguridad', label: 'Seguridad / Logs', icon: ShieldCheck, roles: ['admin', 'jefe'] },
      { id: 'configuracion', label: 'Configuración', icon: Settings },
      { id: 'ayuda', label: 'Ayuda / Guía', icon: BookOpen },
    ],
  },
];
