'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Calendar, Clock, MapPin, Users, Search, Filter } from 'lucide-react';
import { meetingsApi } from '@/lib/api';
import { Meeting, PaginatedResponse } from '@/types';
import { formatDate, formatTime, cn } from '@/lib/utils';

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchMeetings = async () => {
      setLoading(true);
      try {
        const res = await meetingsApi.getAll({ page, limit: 10, status: statusFilter || undefined, search: search || undefined });
        const data = res.data as PaginatedResponse<Meeting>;
        setMeetings(data.data);
        setTotalPages(data.pagination.pages);
      } catch (error) { console.error('Failed to fetch meetings:', error); } finally { setLoading(false); }
    };
    fetchMeetings();
  }, [page, statusFilter, search]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Meetings</h1><p className="text-gray-500">Manage your meetings and schedules</p></div>
        <Link href="/dashboard/meetings/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><Plus size={20} /><span>New Meeting</span></Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="Search meetings..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div className="relative"><Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} /><select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"><option value="">All Status</option><option value="upcoming">Upcoming</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
        </div>
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div> : meetings.length === 0 ? <div className="bg-white rounded-xl shadow-sm p-12 text-center"><Calendar className="mx-auto text-gray-400 mb-4" size={48} /><h3 className="text-lg font-medium text-gray-900">No meetings found</h3><p className="text-gray-500 mt-1">Create your first meeting to get started</p></div> : (
        <div className="grid gap-4">
          {meetings.map((meeting) => (
            <Link key={meeting.id} href={`/dashboard/meetings/${meeting.id}`} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3"><h3 className="text-lg font-semibold text-gray-900">{meeting.title}</h3><span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(meeting.status))}>{meeting.status}</span></div>
                  {meeting.subject && <p className="text-gray-600">{meeting.subject}</p>}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1"><Calendar size={16} /><span>{formatDate(meeting.date)}</span></div>
                    {meeting.time && <div className="flex items-center gap-1"><Clock size={16} /><span>{formatTime(meeting.time)}</span></div>}
                    {meeting.location && <div className="flex items-center gap-1"><MapPin size={16} /><span>{meeting.location}</span></div>}
                    <div className="flex items-center gap-1"><Users size={16} /><span>{meeting.participant_count} participants</span></div>
                  </div>
                </div>
                <div className="text-right text-sm"><div className="text-gray-500">{meeting.task_count} tasks</div>{meeting.pending_tasks > 0 && <div className="text-yellow-600">{meeting.pending_tasks} pending</div>}{meeting.urgent_tasks > 0 && <div className="text-red-600">{meeting.urgent_tasks} urgent</div>}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {totalPages > 1 && <div className="flex justify-center gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border rounded-lg disabled:opacity-50">Previous</button><span className="px-4 py-2">Page {page} of {totalPages}</span><button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 border rounded-lg disabled:opacity-50">Next</button></div>}
    </div>
  );
}