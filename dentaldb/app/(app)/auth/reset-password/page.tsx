import { Suspense } from 'react';
import ResetPasswordForm from './ResetPasswordForm';

// This outer page component never calls useSearchParams itself,
// so Next.js can prerender it without a Suspense error.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}