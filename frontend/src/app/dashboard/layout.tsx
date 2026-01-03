'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { useAuthStore } from '@/store/auth';
import { useLanguage } from '@/lib/LanguageContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const { isRTL } = useLanguage();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className={`min-h-screen flex bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <Sidebar />
      <main className={`flex-1 ${isRTL ? 'lg:mr-0' : 'lg:ml-0'} p-6 pt-16 lg:pt-6`}>
        {children}
      </main>
    </div>
  );
}
