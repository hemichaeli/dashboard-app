'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { analyticsApi, meetingsApi } from '@/lib/api';
import { DashboardStats, Meeting } from '@/types';
import { useLanguage } from '@/lib/LanguageContext';

interface RecentMeeting extends Meeting {
  participant_count?: number;
  task_count?: number;
}

export default function DashboardPage() {
  const { t, isRTL } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentMeetings, setRecentMeetings] = useState<RecentMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, meetingsRes] = await Promise.all([
          analyticsApi.getDashboardStats(),
          meetingsApi.getAll({ limit: 5 })
        ]);
        setStats(statsRes.data);
        setRecentMeetings(meetingsRes.data.meetings || []);
      } catch (error) { 
        console.error('Failed to fetch dashboard data:', error); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="badge-analyzed">Analyzed</span>;
      case 'in_progress':
        return <span className="badge-processing">Processing</span>;
      default:
        return <span className="badge-pending">Pending</span>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: 'graphic_eq', bgColor: 'bg-blue-900/30', textColor: 'text-[#135bec]' };
      case 'in_progress':
        return { icon: 'hourglass_top', bgColor: 'bg-orange-900/30', textColor: 'text-orange-400' };
      default:
        return { icon: 'calendar_month', bgColor: 'bg-purple-900/30', textColor: 'text-purple-400' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined animate-spin text-4xl text-[#135bec]">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101622] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#101622]/90 backdrop-blur-md border-b border-gray-800/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#135bec] to-blue-700 flex items-center justify-center text-white font-bold">
                T
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#101622]"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-400">Welcome back</span>
              <h1 className="text-sm font-bold text-white leading-tight">Test User</h1>
            </div>
          </div>
          <button className="flex items-center justify-center w-10 h-10 rounded-full text-gray-300 hover:bg-[#1c2536] transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-[#101622]"></span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-4">
        {/* Hero Section */}
        <div className="pt-6 pb-2">
          <h2 className="text-[28px] font-bold leading-tight tracking-tight mb-6 text-white">
            {isRTL ? 'מוכן לתדרוך\nהבא?' : 'Ready for the\nnext briefing?'}
          </h2>
          
          {/* Primary Action Button */}
          <Link 
            href="/dashboard/meetings/new"
            className="w-full relative overflow-hidden group rounded-2xl bg-[#135bec] text-white p-1 shadow-lg shadow-[#135bec]/25 transition-all hover:shadow-[#135bec]/40 active:scale-[0.98] block"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex h-14 items-center justify-center gap-3 px-6">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <span className="material-symbols-outlined icon-filled text-white text-[20px]">mic</span>
              </div>
              <span className="text-lg font-bold tracking-wide">{t('newMeeting') || 'Start New Recording'}</span>
            </div>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="py-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Total Meetings */}
            <div className="flex flex-col gap-3 rounded-2xl p-5 bg-[#1c2536] border border-gray-800 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-900/20 text-[#135bec]">
                  <span className="material-symbols-outlined text-[20px]">equalizer</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Meetings</p>
                <p className="text-2xl font-bold text-white mt-1">{stats?.totalMeetings || 0}</p>
              </div>
            </div>

            {/* Pending Tasks */}
            <div className="flex flex-col gap-3 rounded-2xl p-5 bg-[#1c2536] border border-gray-800 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-900/20 text-orange-400">
                  <span className="material-symbols-outlined text-[20px]">pending_actions</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pending Tasks</p>
                <p className="text-2xl font-bold text-[#135bec] mt-1">{stats?.pendingTasks || 0}</p>
              </div>
            </div>

            {/* Upcoming */}
            <div className="flex flex-col gap-3 rounded-2xl p-5 bg-[#1c2536] border border-gray-800 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-900/20 text-purple-400">
                  <span className="material-symbols-outlined text-[20px]">event_upcoming</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Upcoming</p>
                <p className="text-2xl font-bold text-white mt-1">{stats?.upcomingMeetings || 0}</p>
              </div>
            </div>

            {/* Completed */}
            <div className="flex flex-col gap-3 rounded-2xl p-5 bg-[#1c2536] border border-gray-800 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-teal-900/20 text-teal-400">
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Completed</p>
                <p className="text-2xl font-bold text-white mt-1">{stats?.completedMeetings || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Briefings List */}
        <div>
          <div className="flex items-center justify-between mb-4 pt-2">
            <h3 className="text-xl font-bold text-white">Recent Briefings</h3>
            <Link href="/dashboard/meetings" className="text-sm font-semibold text-[#135bec] hover:text-[#135bec]/80 transition-colors">
              See All
            </Link>
          </div>
          
          <div className="space-y-3">
            {recentMeetings.length === 0 ? (
              <div className="rounded-2xl bg-[#1c2536] border border-gray-800 p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-500 mb-2">calendar_month</span>
                <p className="text-gray-400">No meetings yet</p>
                <Link 
                  href="/dashboard/meetings/new"
                  className="inline-block mt-4 px-4 py-2 bg-[#135bec] text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  Create your first meeting
                </Link>
              </div>
            ) : (
              recentMeetings.map((meeting) => {
                const statusStyle = getStatusIcon(meeting.status);
                return (
                  <Link
                    key={meeting.id}
                    href={`/dashboard/meetings/${meeting.id}`}
                    className="group relative flex flex-col gap-3 rounded-2xl bg-[#1c2536] border border-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-full ${statusStyle.bgColor} flex items-center justify-center shrink-0 ${statusStyle.textColor}`}>
                          <span className="material-symbols-outlined text-[20px]">{statusStyle.icon}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-white leading-tight">{meeting.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">
                              {meeting.date ? new Date(meeting.date).toLocaleDateString() : 'No date'}
                            </span>
                            {meeting.time && (
                              <>
                                <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                                <span className="text-xs text-gray-400">{meeting.time}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(meeting.status)}
                    </div>
                    
                    {meeting.subject && (
                      <div className="pl-[52px]">
                        <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed">
                          {meeting.subject}
                        </p>
                        <div className="flex gap-2 mt-3">
                          {meeting.task_count !== undefined && meeting.task_count > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-800 px-2 py-1 rounded-md">
                              <span className="material-symbols-outlined text-[14px]">bolt</span>
                              {meeting.task_count} Actions
                            </span>
                          )}
                          {meeting.participant_count !== undefined && meeting.participant_count > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-800 px-2 py-1 rounded-md">
                              <span className="material-symbols-outlined text-[14px]">group</span>
                              {meeting.participant_count} People
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#101622]/95 backdrop-blur-lg border-t border-gray-800 pb-safe z-50">
        <div className="flex items-center justify-around h-16 px-2">
          <Link href="/dashboard" className="flex flex-1 flex-col items-center justify-center gap-1 text-[#135bec] group">
            <span className="material-symbols-outlined icon-filled text-[24px] transition-transform group-active:scale-90">dashboard</span>
            <span className="text-[10px] font-semibold">Overview</span>
          </Link>
          <Link href="/dashboard/meetings" className="flex flex-1 flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-300 group">
            <span className="material-symbols-outlined text-[24px] transition-transform group-active:scale-90">calendar_today</span>
            <span className="text-[10px] font-medium">Meetings</span>
          </Link>
          <div className="flex flex-1 flex-col items-center justify-center -mt-8">
            <Link 
              href="/dashboard/meetings/new"
              className="w-14 h-14 rounded-full bg-[#135bec] text-white shadow-lg shadow-[#135bec]/40 flex items-center justify-center hover:bg-[#135bec]/90 transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-[28px]">add</span>
            </Link>
          </div>
          <Link href="/dashboard/analytics" className="flex flex-1 flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-300 group">
            <span className="material-symbols-outlined text-[24px] transition-transform group-active:scale-90">analytics</span>
            <span className="text-[10px] font-medium">Analysis</span>
          </Link>
          <Link href="/dashboard/settings" className="flex flex-1 flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-300 group">
            <span className="material-symbols-outlined text-[24px] transition-transform group-active:scale-90">settings</span>
            <span className="text-[10px] font-medium">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
