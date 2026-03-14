import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium transition-all duration-200',
  {
    variants: {
      variant: {
        active: 'bg-green-100 text-green-800 border border-green-300 animate-pulse',
        inactive: 'bg-gray-100 text-gray-700 border border-gray-300',
        warning: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
        critical: 'bg-red-100 text-red-800 border border-red-300 animate-pulse',
        muted: 'bg-blue-50 text-blue-700 border border-blue-200',
      },
      size: {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-1.5',
      },
    },
    defaultVariants: {
      variant: 'inactive',
      size: 'md',
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof badgeVariants> {
  label: string;
  icon?: React.ReactNode;
  pulse?: boolean;
  tooltip?: string;
  className?: string;
}

export const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ label, icon, variant, size, pulse, tooltip, className }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant, size }), className)}
      title={tooltip}
      role="status"
      aria-live="polite"
    >
      {icon && <span className="mr-1.5 inline-flex">{icon}</span>}
      <span>{label}</span>
    </div>
  )
);

StatusBadge.displayName = 'StatusBadge';

// Usage Examples:
export const StatusBadgeDemo = () => (
  <div className="flex flex-wrap gap-4">
    <StatusBadge variant="active" label="Online" />
    <StatusBadge variant="warning" label="In Game" icon={<span>⚔️</span>} />
    <StatusBadge variant="critical" label="Low Health" pulse />
    <StatusBadge variant="muted" label="Away" size="lg" />
  </div>
);
