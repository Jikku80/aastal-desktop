'use client';
import { GitBranch } from 'lucide-react';

interface NoBranchBannerProps {
  action: 'create appointments' | 'create patients' | 'create invoices' | 'add products';
}

export default function NoBranchBanner({ action }: NoBranchBannerProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm mb-4"
      style={{ background: 'rgba(14,157,232,0.06)', border: '1px solid rgba(14,157,232,0.2)' }}
    >
      <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
        <GitBranch size={15} className="text-brand-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[var(--text-primary)] text-xs">Select a branch to {action}</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
          You&apos;re viewing all branches. Switch to a specific branch using the branch selector above.
        </p>
      </div>
    </div>
  );
}
