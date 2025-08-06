'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { paths } from '@/lib/paths';

export default function Home() {  
  const router = useRouter();

  useEffect(() => {
    router.replace(paths.companies);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to companies...</p>
      </div>
    </div>
  );
}
