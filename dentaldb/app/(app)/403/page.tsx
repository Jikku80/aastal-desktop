'use client';
import { useRouter } from 'next/navigation';
import { ShieldOff, ArrowLeft } from 'lucide-react';

export default function ForbiddenPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="text-center px-6">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <ShieldOff size={36} className="text-red-400" />
        </div>
        <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-2">403</h1>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Access Forbidden</h2>
        <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto mb-8">
          You do not have permission to access this page. Contact your administrator if you believe this is an error.
        </p>
        <button onClick={() => router.push('/dashboard/profile')}
          className="btn-primary mx-auto">
          <ArrowLeft size={14} />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
