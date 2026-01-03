'use client';

import { useLanguage } from '@/lib/LanguageContext';
import { Globe } from 'lucide-react';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-md border border-gray-200">
      <Globe size={18} className="text-blue-600" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as 'en' | 'he')}
        className="bg-white border-none text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
      >
        <option value="en">English</option>
        <option value="he">עברית</option>
      </select>
    </div>
  );
}
