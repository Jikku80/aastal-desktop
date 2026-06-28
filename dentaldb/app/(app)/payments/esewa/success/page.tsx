import React, { Suspense } from 'react';
import ClientSearchParams from './EsewaSuccessPage';

export default function Page() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Search Page</h1>

      {/* Wrap the client component in Suspense */}
      <Suspense fallback={<p>Loading search params...</p>}>
        <ClientSearchParams />
      </Suspense>
    </div>
  );
}