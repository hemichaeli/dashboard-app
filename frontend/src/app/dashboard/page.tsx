'use client';

import { useEffect, useState } from 'react';
import { Users, Calendar, CheckSquare, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { analyticsApi } from '@/lib/api';
import { DashboardStats } from '@/types';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

function StatCard({ title, value, change, icon, color }: { title: string; value: number | string; change?: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change !== undefined && (
            <div className={cn('flex items-center gap-1 text-sm mt-2', change >= 0 ? 'text-green-600' : 'text-red-600')}>
              {change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{Math.abs(change)}% from last month</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-lg', color)}>{icon}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [meetingsData, setMeetingsData] = useState<any[]>([]);
  const [taskStats, setTaskStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, meetingsRes, tasksRes] = await Promise.all([analyticsApi.getDashboardStats(), analyticsApi.getMeetingsByDate(30), analyticsApi.getTaskStats()]);
        setStats(statsRes.data);
        setMeetingsData(meetingsRes.data);
        setTaskStats(tasksRes.data);
      } catch (error) { console.error('Failed to fetch dashboard data:', error); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Dashboard</h1><p className="text-gray-500">Welcome back! Here's what's happening.</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={stats?.totalUsers || 0} change={stats?.userGrowth} icon={<Users className="text-blue-600" size={24} />} color="bg-blue-100" />
        <StatCard title="Upcoming Meetings" value={stats?.upcomingMeetings || 0} icon={<Calendar className="text-green-600" size={24} />} color="bg-green-100" />
        <StatCard title="Pending Tasks" value={stats?.pendingTasks || 0} icon={<CheckSquare className="text-purple-600" size={24} />} color="bg-purple-100" />
        <StatCard title="Urgent Tasks" value={stats?.urgentTasks || 0} icon={<AlertTriangle className="text-red-600" size={24} />} color="bg-red-100" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Meetings Over Time</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={meetingsData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" tick={{ fontSize: 12 }} tickFormatter={(value) => value.slice(5)} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} /></LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Tasks by Status</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'Pending', value: taskStats?.byStatus?.pending || 0 }, { name: 'In Progress', value: taskStats?.byStatus?.in_progress || 0 }, { name: 'Completed', value: taskStats?.byStatus?.completed || 0 }]}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6"><h3 className="text-lg font-semibold mb-4">This Week</h3><div className="space-y-4"><div className="flex justify-between items-center"><span className="text-gray-500">Meetings</span><span className="font-semibold">{stats?.meetingsThisWeek || 0}</span></div><div className="flex justify-between items-center"><span className="text-gray-500">Tasks Completed</span><span className="font-semibold">{stats?.completedTasksThisMonth || 0}</span></div><div className="flex justify-between items-center"><span className="text-gray-500">New Users</span><span className="font-semibold">{stats?.newUsersThisMonth || 0}</span></div></div></div>
        <div className="bg-white rounded-xl shadow-sm p-6"><h3 className="text-lg font-semibold mb-4">Tasks by Priority</h3><div className="space-y-4"><div className="flex justify-between items-center"><span className="text-gray-500">High</span><span className="font-semibold text-red-600">{taskStats?.byPriority?.high || 0}</span></div><div className="flex justify-between items-center"><span className="text-gray-500">Medium</span><span className="font-semibold text-yellow-600">{taskStats?.byPriority?.medium || 0}</span></div><div className="flex justify-between items-center"><span className="text-gray-500">Low</span><span className="font-semibold text-green-600">{taskStats?.byPriority?.low || 0}</span></div></div></div>
        <div className="bg-white rounded-xl shadow-sm p-6"><h3 className="text-lg font-semibold mb-4">Overdue</h3><div className="flex items-center justify-center h-24"><div className="text-center"><p className="text-4xl font-bold text-red-600">{taskStats?.overdue || 0}</p><p className="text-gray-500 text-sm mt-1">overdue tasks</p></div></div></div>
      </div>
    </div>
  );
}