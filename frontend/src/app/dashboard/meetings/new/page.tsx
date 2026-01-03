'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, Trash2, Mic, Square, Play, Pause } from 'lucide-react';
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
  voiceSampleUrl: string;
}

interface VoiceRecorderProps {
  onRecordingComplete: (audioUrl: string) => void;
  onRecordingStop?: () => void;
  existingUrl?: string;
  label: string;
}

function VoiceRecorder({ onRecordingComplete, onRecordingStop, existingUrl, label }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(existingUrl || '');
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecordingComplete(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Call the onRecordingStop callback to update date/time
      if (onRecordingStop) {
        onRecordingStop();
      }
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const deleteRecording = () => {
    setAudioUrl('');
    onRecordingComplete('');
    setDuration(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm text-gray-600">
        <Mic size={14} className="inline mr-1" />
        {label}
      </label>
      
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        {!audioUrl ? (
          <>
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <Mic size={18} />
                Start Recording
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Square size={18} />
                  Stop
                </button>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="text-gray-700 font-mono">{formatTime(duration)}</span>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <button
              type="button"
              onClick={togglePlayback}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <span className="text-gray-600 text-sm">Recording saved</span>
            <button
              type="button"
              onClick={deleteRecording}
              className="ml-auto p-2 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <Trash2 size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function NewMeetingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateTimeAutoSet, setDateTimeAutoSet] = useState(false);
  
  // Initialize with empty date/time - will be set when recording stops
  const [form, setForm] = useState({
    title: '',
    subject: '',
    date: '',
    time: '',
    end_time: '',
    location: '',
    meeting_link: '',
    goals: [''],
    concerns: '',
    my_voice_sample_url: '',
  });

  const [participants, setParticipants] = useState<Participant[]>([
    { name: '', role: '', company: '', background: '', interests: '' }
  ]);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { name: '', position: '', background: '', voiceSampleUrl: '' }
  ]);

  // Function to set current date/time when recording stops
  const setCurrentDateTime = () => {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const endTime = `${String(Math.min(now.getHours() + 1, 23)).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    setForm(prev => ({
      ...prev,
      date: currentDate,
      time: currentTime,
      end_time: endTime,
    }));
    setDateTimeAutoSet(true);
  };

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
    setTeamMembers([...teamMembers, { name: '', position: '', background: '', voiceSampleUrl: '' }]);
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
    if (!form.title) {
      setError('Title is required');
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
          my_voice_sample_url: form.my_voice_sample_url,
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date {dateTimeAutoSet && <span className="text-green-600 text-xs">(auto-set)</span>}
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time {dateTimeAutoSet && <span className="text-green-600 text-xs">(auto-set)</span>}
              </label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time {dateTimeAutoSet && <span className="text-green-600 text-xs">(auto-set)</span>}
              </label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              />
            </div>
          </div>

          {dateTimeAutoSet && (
            <p className="text-sm text-green-600">
              ✓ Date and time automatically set when recording stopped
            </p>
          )}

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
              <VoiceRecorder
                label="Voice Sample (record how they speak)"
                existingUrl={member.voiceSampleUrl}
                onRecordingComplete={(url) => updateTeamMember(index, 'voiceSampleUrl', url)}
              />
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

          <VoiceRecorder
            label="My Voice Sample (record how you communicate)"
            existingUrl={form.my_voice_sample_url}
            onRecordingComplete={(url) => setForm({ ...form, my_voice_sample_url: url })}
            onRecordingStop={setCurrentDateTime}
          />
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
