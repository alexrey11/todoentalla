import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<IconSize, string> = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-7 h-7',
};

type IconProps = {
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
};

export function Icon({ icon: LucideComp, size = 'sm', className }: IconProps) {
  return <LucideComp className={cn(sizeMap[size], className)} />;
}

export { Icon as default };
