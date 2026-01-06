'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
      <div className="min-h-screen flex items-center justify-center bg-[#101622]">
        <span className="material-symbols-outlined animate-spin text-4xl text-[#135bec]">progress_activity</span>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className={`min-h-screen bg-[#101622] text-white font-display ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {children}
    </div>
  );
}
