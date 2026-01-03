'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Users, Calendar, CheckSquare } from 'lucide-react';
import { analyticsApi } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [meetingsData, setMeetingsData] = useState<any[]>([]);
  const [taskStats, setTaskStats] = useState<any>(null);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, meetingsRes, tasksRes, activityRes] = await Promise.all([analyticsApi.getDashboardStats(), analyticsApi.getMeetingsByDate(30), analyticsApi.getTaskStats(), analyticsApi.getUserActivity(10)]);
        setStats(statsRes.data);
        setMeetingsData(meetingsRes.data);
        setTaskStats(tasksRes.data);
        setUserActivity(activityRes.data);
      } catch (error) { console.error('Failed to fetch analytics:', error); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const taskStatusData = [{ name: 'Pending', value: taskStats?.byStatus?.pending || 0 }, { name: 'In Progress', value: taskStats?.byStatus?.in_progress || 0 }, { name: 'Completed', value: taskStats?.byStatus?.completed || 0 }];
  const taskPriorityData = [{ name: 'High', value: taskStats?.byPriority?.high || 0 }, { name: 'Medium', value: taskStats?.byPriority?.medium || 0 }, { name: 'Low', value: taskStats?.byPriority?.low || 0 }];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Analytics</h1><p className="text-gray-500">Insights and statistics</p></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg"><Users className="text-blue-600" size={24} /></div><div><p className="text-sm text-gray-500">Total Users</p><p className="text-2xl font-bold">{stats?.totalUsers || 0}</p></div></div></div>
        <div className="bg-white rounded-xl shadow-sm p-6"><div className="flex items-center gap-4"><div className="p-3 bg-green-100 rounded-lg"><Calendar className="text-green-600" size={24} /></div><div><p className="text-sm text-gray-500">Total Meetings</p><p className="text-2xl font-bold">{stats?.totalMeetings || 0}</p></div></div></div>
        <div className="bg-white rounded-xl shadow-sm p-6"><div className="flex items-center gap-4"><div className="p-3 bg-purple-100 rounded-lg"><CheckSquare className="text-purple-600" size={24} /></div><div><p className="text-sm text-gray-500">Pending Tasks</p><p className="text-2xl font-bold">{stats?.pendingTasks || 0}</p></div></div></div>
        <div className="bg-white rounded-xl shadow-sm p-6"><div className="flex items-center gap-4"><div className="p-3 bg-yellow-100 rounded-lg"><TrendingUp className="text-yellow-600" size={24} /></div><div><p className="text-sm text-gray-500">Completion Rate</p><p className="text-2xl font-bold">{taskStats?.total ? Math.round((taskStats.byStatus?.completed || 0) / taskStats.total * 100) : 0}%</p></div></div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Meetings Over Time</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={meetingsData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} /></LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Tasks by Status</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskStatusData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Tasks by Priority</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={taskPriorityData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">{taskPriorityData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Recent User Activity</h2>
          <div className="space-y-4 max-h-72 overflow-y-auto">
            {userActivity.length === 0 ? <p className="text-gray-500 text-center py-4">No recent activity</p> : userActivity.map((activity, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm">{activity.user_name?.charAt(0) || 'U'}</div>
                <div className="flex-1 min-w-0"><p className="font-medium text-gray-900 truncate">{activity.user_name || 'Unknown'}</p><p className="text-sm text-gray-500">{activity.meeting_count} meetings, {activity.task_count} tasks</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}