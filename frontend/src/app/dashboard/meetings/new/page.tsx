'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, Trash2, Mic } from 'lucide-react';
import Link from 'next/link';
import { meetingsApi } from '@/lib/api';

interface Participant {
  name: string;
  role: string;
  company: string;
  background: string;
  interests: string;
}

interface TeamMember {
  name: string;
  position: string;
  background: string;
  voiceSample: string;
}

export default function NewMeetingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Get today's date and current time for defaults
  const today = new Date();
  const defaultDate = today.toISOString().split('T')[0];
  const defaultStartTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
  const defaultEndTime = `${String(today.getHours() + 1).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

  const [form, setForm] = useState({
    title: '',
    subject: '',
    date: defaultDate,
    time: defaultStartTime,
    end_time: defaultEndTime,
    location: '',
    meeting_link: '',
    // Brief fields
    goals: [''],
    concerns: '',
    my_voice_sample: '',
  });

  const [participants, setParticipants] = useState<Participant[]>([
    { name: '', role: '', company: '', background: '', interests: '' }
  ]);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { name: '', position: '', background: '', voiceSample: '' }
  ]);

  const addGoal = () => {
    setForm({ ...form, goals: [...form.goals, ''] });
  };

  const updateGoal = (index: number, value: string) => {
    const newGoals = [...form.goals];
    newGoals[index] = value;
    setForm({ ...form, goals: newGoals });
  };

  const removeGoal = (index: number) => {
    if (form.goals.length > 1) {
      setForm({ ...form, goals: form.goals.filter((_, i) => i !== index) });
    }
  };

  const addParticipant = () => {
    setParticipants([...participants, { name: '', role: '', company: '', background: '', interests: '' }]);
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const newParticipants = [...participants];
    newParticipants[index][field] = value;
    setParticipants(newParticipants);
  };

  const removeParticipant = (index: number) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((_, i) => i !== index));
    }
  };

  const addTeamMember = () => {
    setTeamMembers([...teamMembers, { name: '', position: '', background: '', voiceSample: '' }]);
  };

  const updateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
    const newMembers = [...teamMembers];
    newMembers[index][field] = value;
    setTeamMembers(newMembers);
  };

  const removeTeamMember = (index: number) => {
    if (teamMembers.length > 1) {
      setTeamMembers(teamMembers.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date) {
      setError('Title and date are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        goals: form.goals.filter(g => g.trim() !== ''),
        participants: participants.filter(p => p.name.trim() !== '').map(p => ({
          name: p.name,
          role: p.role,
          company: p.company,
          background: p.background,
          notes: p.interests,
        })),
        additional_notes: JSON.stringify({
          concerns: form.concerns,
          my_voice_sample: form.my_voice_sample,
          team_members: teamMembers.filter(t => t.name.trim() !== ''),
        }),
      };
      const res = await meetingsApi.create(payload);
      router.push(`/dashboard/meetings/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create meeting');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/meetings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Meeting</h1>
          <p className="text-gray-500">Create a new meeting with all details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="Meeting title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="Meeting subject"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="Meeting location"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link</label>
              <input
                type="url"
                value={form.meeting_link}
                onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        {/* Goals */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-semibold text-gray-900">Meeting Goals</h2>
            <button
              type="button"
              onClick={addGoal}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus size={16} /> Add Goal
            </button>
          </div>
          
          {form.goals.map((goal, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-gray-500 text-sm w-6">{index + 1}.</span>
              <input
                type="text"
                value={goal}
                onChange={(e) => updateGoal(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder={`Goal ${index + 1}`}
              />
              {form.goals.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGoal(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Participants */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-semibold text-gray-900">Participants</h2>
            <button
              type="button"
              onClick={addParticipant}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus size={16} /> Add Participant
            </button>
          </div>
          
          {participants.map((participant, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Participant {index + 1}</span>
                {participants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeParticipant(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={participant.name}
                  onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Name"
                />
                <input
                  type="text"
                  value={participant.role}
                  onChange={(e) => updateParticipant(index, 'role', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Role / Position"
                />
                <input
                  type="text"
                  value={participant.company}
                  onChange={(e) => updateParticipant(index, 'company', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Company"
                />
                <input
                  type="text"
                  value={participant.interests}
                  onChange={(e) => updateParticipant(index, 'interests', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Interests"
                />
              </div>
              <textarea
                value={participant.background}
                onChange={(e) => updateParticipant(index, 'background', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="Background information..."
                rows={2}
              />
            </div>
          ))}
        </div>

        {/* My Team */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-semibold text-gray-900">My Team</h2>
            <button
              type="button"
              onClick={addTeamMember}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus size={16} /> Add Team Member
            </button>
          </div>
          
          {teamMembers.map((member, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Team Member {index + 1}</span>
                {teamMembers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTeamMember(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={member.name}
                  onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Name"
                />
                <input
                  type="text"
                  value={member.position}
                  onChange={(e) => updateTeamMember(index, 'position', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Position"
                />
              </div>
              <textarea
                value={member.background}
                onChange={(e) => updateTeamMember(index, 'background', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="Background information..."
                rows={2}
              />
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  <Mic size={14} className="inline mr-1" />
                  Voice Sample (paste text example of how they speak)
                </label>
                <textarea
                  value={member.voiceSample}
                  onChange={(e) => updateTeamMember(index, 'voiceSample', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Example of their communication style..."
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Concerns & My Voice */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Additional Notes</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concerns</label>
            <textarea
              value={form.concerns}
              onChange={(e) => setForm({ ...form, concerns: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="Any concerns or things to be aware of..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mic size={14} className="inline mr-1" />
              My Voice Sample (how you communicate)
            </label>
            <textarea
              value={form.my_voice_sample}
              onChange={(e) => setForm({ ...form, my_voice_sample: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="Paste an example of your communication style..."
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/meetings"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            {loading ? 'Creating...' : 'Create Meeting'}
          </button>
        </div>
      </form>
    </div>
  );
}
