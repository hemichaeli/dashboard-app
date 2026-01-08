'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { meetingsApi } from '@/lib/api';
import { Meeting, PaginatedResponse } from '@/types';
import { formatDate, formatTime, cn } from '@/lib/utils';
import { useLanguage } from '@/lib/LanguageContext';

export default function MeetingsPage() {
  const { t } = useLanguage();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchMeetings = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await meetingsApi.getAll({ page, limit: 10, status: statusFilter || undefined, search: search || undefined });
        const data = res.data as PaginatedResponse<Meeting>;
        setMeetings(data?.data || data?.meetings || []);
        setTotalPages(data?.pagination?.pages || 1);
      } catch (err: any) { 
        console.error('Failed to fetch meetings:', err);
        setError(err?.message || 'Failed to load meetings');
        setMeetings([]);
      } finally { 
        setLoading(false); 
      }
    };
    fetchMeetings();
  }, [page, statusFilter, search]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'badge-analyzed';
      case 'in_progress': return 'badge-processing';
      default: return 'badge-pending';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return { icon: 'graphic_eq', bgColor: 'bg-blue-900/30', textColor: 'text-[#135bec]' };
      case 'in_progress': return { icon: 'hourglass_top', bgColor: 'bg-orange-900/30', textColor: 'text-orange-400' };
      default: return { icon: 'calendar_month', bgColor: 'bg-purple-900/30', textColor: 'text-purple-400' };
    }
  };

  const groupMeetingsByDate = (meetings: Meeting[]) => {
    const groups: { [key: string]: Meeting[] } = {};
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    meetings.forEach(meeting => {
      const date = meeting.date || 'No Date';
      let groupKey = date;
      
      if (date === today) groupKey = 'TODAY';
      else if (date === yesterday) groupKey = 'YESTERDAY';
      else if (date !== 'No Date') {
        groupKey = new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(meeting);
    });

    return groups;
  };

  const groupedMeetings = groupMeetingsByDate(meetings);

  return (
    <div className="min-h-screen bg-[#101622] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#101622]/90 backdrop-blur-md border-b border-gray-800/50">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-white">Meetings</h1>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#135bec] to-blue-700 flex items-center justify-center text-white font-bold">
              T
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Search transcripts, titles..."
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            className="w-full pl-12 pr-4 py-3 bg-[#1c2536] border border-gray-800 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#135bec] transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex bg-[#1c2536] rounded-xl p-1">
          <button 
            onClick={() => { setStatusFilter('upcoming'); setPage(1); }}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors',
              statusFilter === 'upcoming' 
                ? 'bg-[#135bec] text-white' 
                : 'text-gray-400 hover:text-white'
            )}
          >
            Upcoming
          </button>
          <button 
            onClick={() => { setStatusFilter('completed'); setPage(1); }}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors',
              statusFilter === 'completed' 
                ? 'bg-[#135bec] text-white' 
                : 'text-gray-400 hover:text-white'
            )}
          >
            Completed
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
            <p className="font-medium">Error loading meetings</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-4xl text-[#135bec]">progress_activity</span>
          </div>
        ) : meetings.length === 0 ? (
          <div className="bg-[#1c2536] rounded-2xl border border-gray-800 p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-gray-500 mb-4">calendar_month</span>
            <h3 className="text-lg font-medium text-white">No meetings found</h3>
            <p className="text-gray-500 mt-1 mb-4">Create your first meeting to get started</p>
            <Link 
              href="/dashboard/meetings/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#135bec] text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              New Meeting
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedMeetings).map(([dateGroup, groupMeetings]) => (
              <div key={dateGroup}>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-1">
                  {dateGroup}
                </h3>
                <div className="space-y-3">
                  {groupMeetings.map((meeting) => {
                    const statusStyle = getStatusIcon(meeting.status);
                    return (
                      <Link 
                        key={meeting.id} 
                        href={`/dashboard/meetings/${meeting.id}`}
                        className="block bg-[#1c2536] rounded-2xl border border-gray-800 p-4 hover:border-gray-700 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          {/* Time Column */}
                          <div className="w-16 flex-shrink-0 text-center">
                            <div className="text-lg font-bold text-white">
                              {meeting.time ? formatTime(meeting.time).split(' ')[0] : '--:--'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {meeting.time ? formatTime(meeting.time).split(' ')[1] || '' : ''}
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="w-px h-12 bg-[#135bec] self-center"></div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-white leading-tight">{meeting.title}</h4>
                                {meeting.subject && (
                                  <p className="text-sm text-gray-400 mt-0.5">{meeting.subject}</p>
                                )}
                              </div>
                              <span className="material-symbols-outlined text-gray-600 text-[20px]">chevron_right</span>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {meeting.status === 'completed' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full ring-1 ring-inset ring-green-500/20">
                                  <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                                  AI Ready
                                </span>
                              )}
                              {meeting.status === 'in_progress' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/10 text-orange-400 text-xs rounded-full ring-1 ring-inset ring-orange-500/20">
                                  <span className="material-symbols-outlined text-[12px]">refresh</span>
                                  Processing
                                </span>
                              )}
                              {(meeting.participant_count || 0) > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                  <span className="material-symbols-outlined text-[14px]">group</span>
                                  {meeting.participant_count}
                                </span>
                              )}
                              {meeting.location && (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                                  {meeting.location}
                                </span>
                              )}
                            </div>

                            {/* AI Summary Preview */}
                            {meeting.status === 'completed' && meeting.subject && (
                              <p className="text-sm text-gray-500 italic mt-2 line-clamp-1">
                                "{meeting.subject}"
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-4">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1} 
              className="px-4 py-2 bg-[#1c2536] border border-gray-800 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-400">
              {page} / {totalPages}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages} 
              className="px-4 py-2 bg-[#1c2536] border border-gray-800 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 z-40">
        <Link 
          href="/dashboard/meetings/new"
          className="w-14 h-14 rounded-full bg-[#135bec] text-white shadow-lg shadow-[#135bec]/40 flex items-center justify-center hover:bg-blue-600 transition-colors"
        >
          <span className="material-symbols-outlined text-[28px]">mic</span>
        </Link>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#101622]/95 backdrop-blur-lg border-t border-gray-800 pb-safe z-50">
        <div className="flex items-center justify-around h-16 px-2">
          <Link href="/dashboard" className="flex flex-1 flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-300">
            <span className="material-symbols-outlined text-[24px]">dashboard</span>
            <span className="text-[10px] font-medium">Overview</span>
          </Link>
          <Link href="/dashboard/meetings" className="flex flex-1 flex-col items-center justify-center gap-1 text-[#135bec]">
            <span className="material-symbols-outlined icon-filled text-[24px]">calendar_today</span>
            <span className="text-[10px] font-semibold">Meetings</span>
          </Link>
          <div className="flex flex-1 flex-col items-center justify-center -mt-8">
            <Link href="/dashboard/meetings/new" className="w-14 h-14 rounded-full bg-[#135bec] text-white shadow-lg shadow-[#135bec]/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">add</span>
            </Link>
          </div>
          <Link href="/dashboard/analytics" className="flex flex-1 flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-300">
            <span className="material-symbols-outlined text-[24px]">analytics</span>
            <span className="text-[10px] font-medium">Analysis</span>
          </Link>
          <Link href="/dashboard/settings" className="flex flex-1 flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-300">
            <span className="material-symbols-outlined text-[24px]">settings</span>
            <span className="text-[10px] font-medium">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
