'use client';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void; icon?: React.ElementType };
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3"
      style={{
        background: 'var(--header-bg, var(--bg-surface))',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        minHeight: '56px',
      }}
    >
      {/* Left — title */}
      <div className="min-w-0 mr-3">
        <h1 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate leading-tight">
          {title}
        </h1>
        {subtitle
          ? <p className="text-xs text-[var(--text-muted)] truncate">{subtitle}</p>
          : <p className="text-xs text-[var(--text-muted)] hidden sm:block leading-tight">
              {format(new Date(), 'EEEE, MMMM d yyyy')}
            </p>
        }
      </div>

      {/* Right — page action */}
      {action && (() => {
        const ActionIcon = action.icon;
        return (
          <button onClick={action.onClick} className="btn-primary text-xs py-2 px-3 sm:px-4 shrink-0">
            {ActionIcon ? <ActionIcon size={13} /> : <Plus size={13} />}
            <span className="hidden sm:inline ml-1">{action.label}</span>
            <span className="sm:hidden">New</span>
          </button>
        );
      })()}
    </header>
  );
}