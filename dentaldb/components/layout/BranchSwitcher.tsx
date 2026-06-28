'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronDown, Check, Plus, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import type { Branch } from '@/types';
import toast from 'react-hot-toast';

export default function BranchSwitcher() {
  const [open, setOpen] = useState(false);
  const { branches, activeBranch, setActiveBranch, user } = useAuthStore();
  const router  = useRouter();
  const isAdmin = ['super_admin', 'owner'].includes(user?.role ?? '');

  const handleSelectBranch = (branch: Branch | null) => {
    // Locked or inactive branches cannot be selected as active context
    if (branch?.isLocked) {
      toast.error('This branch is locked. Upgrade your plan to unlock it.', { duration: 3000 });
      setOpen(false);
      return;
    }
    if (branch && !branch.isActive) {
      toast.error('This branch is inactive. Activate it from the Branches page first.', { duration: 3000 });
      setOpen(false);
      return;
    }
    setActiveBranch(branch);
    setOpen(false);
  };

  // Single-branch non-admin: show a locked indicator, no dropdown
  if (branches.length === 1 && !isAdmin) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          maxWidth: '180px',
        }}
        title="You are assigned to this branch only"
      >
        <Building2 size={12} className="text-brand-400 shrink-0" />
        <span className="truncate">{activeBranch?.name ?? branches[0]?.name ?? 'Branch'}</span>
        <Lock size={10} className="text-[var(--text-muted)] shrink-0" />
      </div>
    );
  }

  // No branches at all and not admin — render nothing
  if (branches.length === 0 && !isAdmin) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:bg-white/5"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          maxWidth: '200px',
        }}
      >
        <Building2 size={12} className="text-brand-400 shrink-0" />
        <span className="truncate">{activeBranch?.name ?? 'All Branches'}</span>
        <ChevronDown size={11} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1.5 z-40 rounded-xl overflow-hidden shadow-xl w-64"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              {/* "All Branches" option — only for admin */}
              {isAdmin && (
                <button
                  onClick={() => handleSelectBranch(null)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium transition-colors hover:bg-white/5"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <span className="text-[var(--text-secondary)]">All Branches</span>
                  {!activeBranch && <Check size={12} className="text-brand-400" />}
                </button>
              )}

              {/* Individual branches */}
              {branches.map(branch => {
                const isSelected     = activeBranch?.id === branch.id;
                const isBranchLocked = branch.isLocked;
                const isBranchInactive = !branch.isActive && !branch.isLocked;

                return (
                  <button
                    key={branch.id}
                    onClick={() => handleSelectBranch(branch)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors text-left ${
                      isBranchLocked || isBranchInactive
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-white/5'
                    }`}
                    style={{ borderBottom: '1px solid var(--border)' }}
                    title={
                      isBranchLocked
                        ? 'Branch locked — quota exceeded, upgrade plan'
                        : isBranchInactive
                        ? 'Branch inactive — activate from Branches page'
                        : undefined
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">{branch.name}</p>
                      {branch.address && (
                        <p className="text-[10px] text-[var(--text-muted)] truncate">{branch.address}</p>
                      )}
                      {isBranchInactive && (
                        <p className="text-[10px] text-gray-400">Inactive</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      {isBranchLocked && <Lock size={10} className="text-red-400" />}
                      {isSelected && <Check size={12} className="text-brand-400" />}
                    </div>
                  </button>
                );
              })}

              {/* Manage branches — admin only */}
              {isAdmin && (
                <button
                  onClick={() => { setOpen(false); router.push('/dashboard/branches'); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-brand-400 hover:bg-brand-400/5 transition-colors"
                >
                  <Plus size={11} /> Manage Branches
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
