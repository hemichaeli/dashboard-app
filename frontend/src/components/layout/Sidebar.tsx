'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Calendar, BarChart3, Settings, LogOut, Menu, X, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useState, useEffect } from 'react';

const navigation = [
  { name: 'Dashboard', nameHe: 'לוח בקרה', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Meetings', nameHe: 'פגישות', href: '/dashboard/meetings', icon: Calendar },
  { name: 'Users', nameHe: 'משתמשים', href: '/dashboard/users', icon: Users },
  { name: 'Analytics', nameHe: 'אנליטיקס', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', nameHe: 'הגדרות', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [language, setLanguage] = useState<'en' | 'he'>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as 'en' | 'he';
    if (savedLang) {
      setLanguage(savedLang);
      document.documentElement.dir = savedLang === 'he' ? 'rtl' : 'ltr';
    }
  }, []);

  const handleLanguageChange = (lang: 'en' | 'he') => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    window.location.reload(); // Reload to apply translations
  };

  const handleLogout = () => { logout(); window.location.href = '/auth/login'; };

  const isHebrew = language === 'he';

  return (
    <>
      <button className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md" onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      {mobileOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />}
      <aside className={cn('fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-200 ease-in-out', mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-800">
            <h1 className="text-xl font-bold">{isHebrew ? 'לוח בקרה' : 'Dashboard'}</h1>
          </div>
          
          {/* Language Selector */}
          <div className="px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-2 text-gray-300">
              <Globe size={18} />
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'he')}
                className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="en">English</option>
                <option value="he">עברית</option>
              </select>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link key={item.name} href={item.href} onClick={() => setMobileOpen(false)} className={cn('flex items-center gap-3 px-4 py-3 rounded-lg transition-colors', isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white')}>
                  <item.icon size={20} /><span>{isHebrew ? item.nameHe : item.name}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium">{user?.name?.charAt(0).toUpperCase() || 'U'}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{user?.name || 'User'}</p><p className="text-xs text-gray-400 truncate">{user?.email}</p></div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"><LogOut size={20} /><span>{isHebrew ? 'התנתק' : 'Logout'}</span></button>
          </div>
        </div>
      </aside>
    </>
  );
}
