'use client';
import Link from 'next/link';
import { GitBranch, Plus } from 'lucide-react';

interface NoBranchesExistBannerProps {
  /** Human-readable feature name, e.g. "Payroll", "Expenses", "Commissions" */
  feature: string;
}

/**
 * Full-page empty state shown when a clinic has zero branches set up at
 * all — distinct from NoBranchBanner, which is a small inline nudge shown
 * when branches exist but none is currently selected ("viewing all
 * branches"). Several features (payroll, expenses, commissions, ...) are
 * scoped per-branch and have nothing meaningful to show until at least
 * one branch exists, so they render this instead of their normal content.
 */
export function NoBranchesExistBanner({ feature }: NoBranchesExistBannerProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16">
      <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-4">
        <GitBranch size={24} className="text-brand-400" />
      </div>
      <p className="font-semibold text-[var(--text-primary)] text-sm">No branches set up yet</p>
      <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-xs">
        {feature} is organized per branch. Add your first branch to start using it.
      </p>
      <Link
        href="/dashboard/branches"
        className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 transition-colors"
      >
        <Plus size={14} />
        Add a branch
      </Link>
    </div>
  );
}

export default NoBranchesExistBanner;