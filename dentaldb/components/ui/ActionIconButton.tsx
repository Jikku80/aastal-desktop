'use client';
import { forwardRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export type ActionVariant = 'default' | 'danger' | 'primary' | 'success' | 'warning';

interface ActionIconButtonProps {
  icon:       ReactNode;
  onClick?:   (e: React.MouseEvent) => void;
  tooltip?:   string;
  variant?:   ActionVariant;
  size?:      'sm' | 'md' | 'lg';
  loading?:   boolean;
  disabled?:  boolean;
  className?: string;
  type?:      'button' | 'submit';
  href?:      string;
}

const VARIANT_STYLES: Record<ActionVariant, string> = {
  default: [
    'text-[var(--text-muted)]',
    'hover:text-[var(--text-primary)] hover:bg-white/8',
    'focus-visible:ring-white/20',
    ':root[data-theme="light"] &:hover { background: rgba(0,0,0,0.06); }',
  ].join(' '),
  danger:  [
    'text-[var(--text-muted)]',
    'hover:text-red-400 hover:bg-red-400/10',
    'focus-visible:ring-red-400/30',
  ].join(' '),
  primary: [
    'text-brand-400',
    'hover:text-brand-300 hover:bg-brand-400/10',
    'focus-visible:ring-brand-400/30',
  ].join(' '),
  success: [
    'text-emerald-400',
    'hover:text-emerald-300 hover:bg-emerald-400/10',
    'focus-visible:ring-emerald-400/30',
  ].join(' '),
  warning: [
    'text-amber-400',
    'hover:text-amber-300 hover:bg-amber-400/10',
    'focus-visible:ring-amber-400/30',
  ].join(' '),
};

const SIZE_STYLES = {
  sm: 'w-8 h-8 min-w-[32px] min-h-[32px]',
  md: 'w-10 h-10 min-w-[40px] min-h-[40px]',
  lg: 'w-11 h-11 min-w-[44px] min-h-[44px]',
};

const ICON_SIZES = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' };

/**
 * Standardised action icon button used across the entire app.
 *
 * - Minimum 40×40 tap target (md size)
 * - Semantic colour variants: default | danger | primary | success | warning
 * - Native tooltip via `title` attribute
 * - Accessible focus ring
 * - Loading spinner replaces icon
 *
 * Usage:
 *   <ActionIconButton icon={<Edit />} tooltip="Edit" onClick={...} />
 *   <ActionIconButton icon={<Trash2 />} variant="danger" tooltip="Delete" onClick={...} />
 */
export const ActionIconButton = forwardRef<HTMLButtonElement, ActionIconButtonProps>(
  (
    {
      icon, onClick, tooltip, variant = 'default', size = 'md',
      loading = false, disabled = false, className, type = 'button',
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        title={tooltip}
        aria-label={tooltip}
        disabled={disabled || loading}
        onClick={onClick}
        className={clsx(
          // Base
          'inline-flex items-center justify-center rounded-xl',
          'transition-all duration-150 cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2',
          // Disabled
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
          // Size
          SIZE_STYLES[size],
          // Variant
          VARIANT_STYLES[variant],
          className,
        )}
      >
        {loading
          ? <Loader2 className={clsx('animate-spin', ICON_SIZES[size])} />
          : <span className={clsx('flex items-center justify-center', ICON_SIZES[size])}>
              {icon}
            </span>
        }
      </button>
    );
  },
);

ActionIconButton.displayName = 'ActionIconButton';

/** Convenience group wrapper to keep icons evenly spaced */
export function ActionIconGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex items-center gap-1', className)}>
      {children}
    </div>
  );
}
