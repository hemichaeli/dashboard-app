'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { meetingsApi } from '@/lib/api';

export default function NewMeetingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', subject: '', date: '', time: '', end_time: '', location: '', meeting_link: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date) { setError('Title and date are required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await meetingsApi.create(form);
      router.push(`/dashboard/meetings/${res.data.id}`);
    } catch (err: any) { setError(err.response?.data?.error || 'Failed to create meeting'); setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/meetings" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
        <div><h1 className="text-2xl font-bold text-gray-900">New Meeting</h1><p className="text-gray-500">Create a new meeting</p></div>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Meeting title" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Subject</label><input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Meeting subject" /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Date *</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label><input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">End Time</label><input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Location</label><input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Meeting location" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link</label><input type="url" value={form.meeting_link} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." /></div>
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/meetings" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</Link>
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading && <Loader2 className="animate-spin" size={16} />}{loading ? 'Creating...' : 'Create Meeting'}</button>
        </div>
      </form>
    </div>
  );
}