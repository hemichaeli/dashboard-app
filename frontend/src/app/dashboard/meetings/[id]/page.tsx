'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, MapPin, Link as LinkIcon, Users, CheckSquare, Edit2, Trash2, Plus, Loader2 } from 'lucide-react';
import { meetingsApi } from '@/lib/api';
import { Meeting, Participant, Task } from '@/types';
import { formatDate, formatTime, cn } from '@/lib/utils';

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'brief' | 'participants' | 'tasks'>('brief');

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const res = await meetingsApi.getById(params.id as string);
        setMeeting(res.data);
      } catch (error) { console.error('Failed to fetch meeting:', error); router.push('/dashboard/meetings'); } finally { setLoading(false); }
    };
    fetchMeeting();
  }, [params.id, router]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;
    try {
      await meetingsApi.delete(params.id as string);
      router.push('/dashboard/meetings');
    } catch (error) { console.error('Failed to delete meeting:', error); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!meeting) return null;

  const getStatusColor = (status: string) => {
    switch (status) { case 'upcoming': return 'bg-blue-100 text-blue-800'; case 'completed': return 'bg-green-100 text-green-800'; case 'cancelled': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/meetings" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
          <div><h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1><p className="text-gray-500">{meeting.subject}</p></div>
          <span className={cn('px-3 py-1 rounded-full text-sm font-medium', getStatusColor(meeting.status))}>{meeting.status}</span>
        </div>
        <div className="flex gap-2"><button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} />Delete</button></div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2"><Calendar size={18} /><span>{formatDate(meeting.date)}</span></div>
          {meeting.time && <div className="flex items-center gap-2"><Clock size={18} /><span>{formatTime(meeting.time)}{meeting.end_time && ` - ${formatTime(meeting.end_time)}`}</span></div>}
          {meeting.location && <div className="flex items-center gap-2"><MapPin size={18} /><span>{meeting.location}</span></div>}
          {meeting.meeting_link && <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline"><LinkIcon size={18} />Join Meeting</a>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b">
          <nav className="flex">
            {(['brief', 'participants', 'tasks'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={cn('px-6 py-4 text-sm font-medium border-b-2 transition-colors', activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>{tab === 'brief' ? 'Meeting Brief' : tab === 'participants' ? `Participants (${meeting.participants?.length || 0})` : `Tasks (${meeting.tasks?.length || 0})`}</button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'brief' && (
            <div className="space-y-6">
              {meeting.purpose && <div><h3 className="font-medium text-gray-900 mb-2">Purpose</h3><p className="text-gray-600">{meeting.purpose}</p></div>}
              {meeting.goals && meeting.goals.length > 0 && <div><h3 className="font-medium text-gray-900 mb-2">Goals</h3><ul className="list-disc list-inside text-gray-600">{meeting.goals.map((goal, i) => <li key={i}>{goal}</li>)}</ul></div>}
              {meeting.agenda && meeting.agenda.length > 0 && <div><h3 className="font-medium text-gray-900 mb-2">Agenda</h3><div className="space-y-2">{meeting.agenda.map((item, i) => <div key={i} className="p-3 bg-gray-50 rounded-lg"><span className="font-medium">{item.title}</span>{item.duration && <span className="text-gray-500 ml-2">({item.duration} min)</span>}</div>)}</div></div>}
              {meeting.things_to_be_aware_of && <div><h3 className="font-medium text-gray-900 mb-2">Things to Be Aware Of</h3><p className="text-gray-600">{meeting.things_to_be_aware_of}</p></div>}
              {meeting.additional_notes && <div><h3 className="font-medium text-gray-900 mb-2">Additional Notes</h3><p className="text-gray-600">{meeting.additional_notes}</p></div>}
            </div>
          )}
          {activeTab === 'participants' && (
            <div className="space-y-4">
              {meeting.participants?.length === 0 ? <p className="text-gray-500 text-center py-8">No participants added yet</p> : meeting.participants?.map((p) => (
                <div key={p.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                  <div><div className="font-medium text-gray-900">{p.name}</div>{p.email && <div className="text-sm text-gray-500">{p.email}</div>}{p.role && <div className="text-sm text-gray-600 mt-1">{p.role}{p.company && ` at ${p.company}`}</div>}</div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {meeting.tasks?.length === 0 ? <p className="text-gray-500 text-center py-8">No tasks added yet</p> : meeting.tasks?.map((t) => (
                <div key={t.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                  <div><div className="font-medium text-gray-900">{t.title}</div>{t.description && <div className="text-sm text-gray-600 mt-1">{t.description}</div>}<div className="flex gap-2 mt-2"><span className={cn('px-2 py-0.5 rounded text-xs', t.status === 'completed' ? 'bg-green-100 text-green-800' : t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800')}>{t.status}</span><span className={cn('px-2 py-0.5 rounded text-xs', t.priority === 'high' ? 'bg-red-100 text-red-800' : t.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800')}>{t.priority}</span></div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}