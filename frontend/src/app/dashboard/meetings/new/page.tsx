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
  existingUrl?: string;
  label: string;
}

function VoiceRecorder({ onRecordingComplete, existingUrl, label }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(existingUrl || '');
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef&lt;MediaRecorder | null&gt;(null);
  const audioRef = useRef&lt;HTMLAudioElement | null&gt;(null);
  const chunksRef = useRef&lt;Blob[]&gt;([]);
  const timerRef = useRef&lt;NodeJS.Timeout | null&gt;(null);

  const startRecording = async () =&gt; {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) =&gt; {
        if (e.data.size &gt; 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () =&gt; {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecordingComplete(url);
        stream.getTracks().forEach(track =&gt; track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() =&gt; {
        setDuration(d =&gt; d + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () =&gt; {
    if (mediaRecorderRef.current &amp;&amp; isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const togglePlayback = () =&gt; {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const deleteRecording = () =&gt; {
    setAudioUrl('');
    onRecordingComplete('');
    setDuration(0);
  };

  const formatTime = (seconds: number) =&gt; {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    &lt;div className="space-y-2"&gt;
      &lt;label className="block text-sm text-gray-600"&gt;
        &lt;Mic size={14} className="inline mr-1" /&gt;
        {label}
      &lt;/label&gt;
      
      &lt;div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"&gt;
        {!audioUrl ? (
          &lt;&gt;
            {!isRecording ? (
              &lt;button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              &gt;
                &lt;Mic size={18} /&gt;
                Start Recording
              &lt;/button&gt;
            ) : (
              &lt;&gt;
                &lt;button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
                &gt;
                  &lt;Square size={18} /&gt;
                  Stop
                &lt;/button&gt;
                &lt;div className="flex items-center gap-2"&gt;
                  &lt;span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"&gt;&lt;/span&gt;
                  &lt;span className="text-gray-700 font-mono"&gt;{formatTime(duration)}&lt;/span&gt;
                &lt;/div&gt;
              &lt;/&gt;
            )}
          &lt;/&gt;
        ) : (
          &lt;&gt;
            &lt;audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() =&gt; setIsPlaying(false)}
              className="hidden"
            /&gt;
            &lt;button
              type="button"
              onClick={togglePlayback}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            &gt;
              {isPlaying ? &lt;Pause size={18} /&gt; : &lt;Play size={18} /&gt;}
              {isPlaying ? 'Pause' : 'Play'}
            &lt;/button&gt;
            &lt;span className="text-gray-600 text-sm"&gt;Recording saved&lt;/span&gt;
            &lt;button
              type="button"
              onClick={deleteRecording}
              className="ml-auto p-2 text-red-500 hover:bg-red-50 rounded-lg"
            &gt;
              &lt;Trash2 size={18} /&gt;
            &lt;/button&gt;
          &lt;/&gt;
        )}
      &lt;/div&gt;
    &lt;/div&gt;
  );
}

export default function NewMeetingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Get today's date and current time for defaults
  const today = new Date();
  const defaultDate = today.toISOString().split('T')[0];
  const defaultStartTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
  const defaultEndTime = `${String(Math.min(today.getHours() + 1, 23)).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

  const [form, setForm] = useState({
    title: '',
    subject: '',
    date: defaultDate,
    time: defaultStartTime,
    end_time: defaultEndTime,
    location: '',
    meeting_link: '',
    goals: [''],
    concerns: '',
    my_voice_sample_url: '',
  });

  const [participants, setParticipants] = useState&lt;Participant[]&gt;([
    { name: '', role: '', company: '', background: '', interests: '' }
  ]);

  const [teamMembers, setTeamMembers] = useState&lt;TeamMember[]&gt;([
    { name: '', position: '', background: '', voiceSampleUrl: '' }
  ]);

  const addGoal = () =&gt; {
    setForm({ ...form, goals: [...form.goals, ''] });
  };

  const updateGoal = (index: number, value: string) =&gt; {
    const newGoals = [...form.goals];
    newGoals[index] = value;
    setForm({ ...form, goals: newGoals });
  };

  const removeGoal = (index: number) =&gt; {
    if (form.goals.length &gt; 1) {
      setForm({ ...form, goals: form.goals.filter((_, i) =&gt; i !== index) });
    }
  };

  const addParticipant = () =&gt; {
    setParticipants([...participants, { name: '', role: '', company: '', background: '', interests: '' }]);
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) =&gt; {
    const newParticipants = [...participants];
    newParticipants[index][field] = value;
    setParticipants(newParticipants);
  };

  const removeParticipant = (index: number) =&gt; {
    if (participants.length &gt; 1) {
      setParticipants(participants.filter((_, i) =&gt; i !== index));
    }
  };

  const addTeamMember = () =&gt; {
    setTeamMembers([...teamMembers, { name: '', position: '', background: '', voiceSampleUrl: '' }]);
  };

  const updateTeamMember = (index: number, field: keyof TeamMember, value: string) =&gt; {
    const newMembers = [...teamMembers];
    newMembers[index][field] = value;
    setTeamMembers(newMembers);
  };

  const removeTeamMember = (index: number) =&gt; {
    if (teamMembers.length &gt; 1) {
      setTeamMembers(teamMembers.filter((_, i) =&gt; i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) =&gt; {
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
        goals: form.goals.filter(g =&gt; g.trim() !== ''),
        participants: participants.filter(p =&gt; p.name.trim() !== '').map(p =&gt; ({
          name: p.name,
          role: p.role,
          company: p.company,
          background: p.background,
          notes: p.interests,
        })),
        additional_notes: JSON.stringify({
          concerns: form.concerns,
          my_voice_sample_url: form.my_voice_sample_url,
          team_members: teamMembers.filter(t =&gt; t.name.trim() !== ''),
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
    &lt;div className="max-w-4xl mx-auto space-y-6"&gt;
      &lt;div className="flex items-center gap-4"&gt;
        &lt;Link href="/dashboard/meetings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors"&gt;
          &lt;ArrowLeft size={20} className="text-gray-600" /&gt;
        &lt;/Link&gt;
        &lt;div&gt;
          &lt;h1 className="text-2xl font-bold text-gray-900"&gt;New Meeting&lt;/h1&gt;
          &lt;p className="text-gray-500"&gt;Create a new meeting with all details&lt;/p&gt;
        &lt;/div&gt;
      &lt;/div&gt;

      &lt;form onSubmit={handleSubmit} className="space-y-6"&gt;
        {error &amp;&amp; (
          &lt;div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm"&gt;
            {error}
          &lt;/div&gt;
        )}

        {/* Basic Info */}
        &lt;div className="bg-white rounded-xl shadow-sm p-6 space-y-4"&gt;
          &lt;h2 className="text-lg font-semibold text-gray-900 border-b pb-2"&gt;Basic Information&lt;/h2&gt;
          
          &lt;div&gt;
            &lt;label className="block text-sm font-medium text-gray-700 mb-1"&gt;Title *&lt;/label&gt;
            &lt;input
              type="text"
              value={form.title}
              onChange={(e) =&gt; setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="Meeting title"
            /&gt;
          &lt;/div&gt;

          &lt;div&gt;
            &lt;label className="block text-sm font-medium text-gray-700 mb-1"&gt;Subject&lt;/label&gt;
            &lt;input
              type="text"
              value={form.subject}
              onChange={(e) =&gt; setForm({ ...form, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="Meeting subject"
            /&gt;
          &lt;/div&gt;

          &lt;div className="grid grid-cols-1 md:grid-cols-3 gap-4"&gt;
            &lt;div&gt;
              &lt;label className="block text-sm font-medium text-gray-700 mb-1"&gt;Date&lt;/label&gt;
              &lt;input
                type="date"
                value={form.date}
                onChange={(e) =&gt; setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              /&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;label className="block text-sm font-medium text-gray-700 mb-1"&gt;Start Time&lt;/label&gt;
              &lt;input
                type="time"
                value={form.time}
                onChange={(e) =&gt; setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              /&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;label className="block text-sm font-medium text-gray-700 mb-1"&gt;End Time&lt;/label&gt;
              &lt;input
                type="time"
                value={form.end_time}
                onChange={(e) =&gt; setForm({ ...form, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              /&gt;
            &lt;/div&gt;
          &lt;/div&gt;

          &lt;div className="grid grid-cols-1 md:grid-cols-2 gap-4"&gt;
            &lt;div&gt;
              &lt;label className="block text-sm font-medium text-gray-700 mb-1"&gt;Location&lt;/label&gt;
              &lt;input
                type="text"
                value={form.location}
                onChange={(e) =&gt; setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="Meeting location"
              /&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;label className="block text-sm font-medium text-gray-700 mb-1"&gt;Meeting Link&lt;/label&gt;
              &lt;input
                type="url"
                value={form.meeting_link}
                onChange={(e) =&gt; setForm({ ...form, meeting_link: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="https://..."
              /&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        &lt;/div&gt;

        {/* Goals */}
        &lt;div className="bg-white rounded-xl shadow-sm p-6 space-y-4"&gt;
          &lt;div className="flex items-center justify-between border-b pb-2"&gt;
            &lt;h2 className="text-lg font-semibold text-gray-900"&gt;Meeting Goals&lt;/h2&gt;
            &lt;button
              type="button"
              onClick={addGoal}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            &gt;
              &lt;Plus size={16} /&gt; Add Goal
            &lt;/button&gt;
          &lt;/div&gt;
          
          {form.goals.map((goal, index) =&gt; (
            &lt;div key={index} className="flex items-center gap-2"&gt;
              &lt;span className="text-gray-500 text-sm w-6"&gt;{index + 1}.&lt;/span&gt;
              &lt;input
                type="text"
                value={goal}
                onChange={(e) =&gt; updateGoal(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder={`Goal ${index + 1}`}
              /&gt;
              {form.goals.length &gt; 1 &amp;&amp; (
                &lt;button
                  type="button"
                  onClick={() =&gt; removeGoal(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                &gt;
                  &lt;Trash2 size={16} /&gt;
                &lt;/button&gt;
              )}
            &lt;/div&gt;
          ))}
        &lt;/div&gt;

        {/* Participants */}
        &lt;div className="bg-white rounded-xl shadow-sm p-6 space-y-4"&gt;
          &lt;div className="flex items-center justify-between border-b pb-2"&gt;
            &lt;h2 className="text-lg font-semibold text-gray-900"&gt;Participants&lt;/h2&gt;
            &lt;button
              type="button"
              onClick={addParticipant}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            &gt;
              &lt;Plus size={16} /&gt; Add Participant
            &lt;/button&gt;
          &lt;/div&gt;
          
          {participants.map((participant, index) =&gt; (
            &lt;div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3"&gt;
              &lt;div className="flex items-center justify-between"&gt;
                &lt;span className="font-medium text-gray-700"&gt;Participant {index + 1}&lt;/span&gt;
                {participants.length &gt; 1 &amp;&amp; (
                  &lt;button
                    type="button"
                    onClick={() =&gt; removeParticipant(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  &gt;
                    &lt;Trash2 size={16} /&gt;
                  &lt;/button&gt;
                )}
              &lt;/div&gt;
              &lt;div className="grid grid-cols-1 md:grid-cols-2 gap-3"&gt;
                &lt;input
                  type="text"
                  value={participant.name}
                  onChange={(e) =&gt; updateParticipant(index, 'name', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Name"
                /&gt;
                &lt;input
                  type="text"
                  value={participant.role}
                  onChange={(e) =&gt; updateParticipant(index, 'role', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Role / Position"
                /&gt;
                &lt;input
                  type="text"
                  value={participant.company}
                  onChange={(e) =&gt; updateParticipant(index, 'company', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Company"
                /&gt;
                &lt;input
                  type="text"
                  value={participant.interests}
                  onChange={(e) =&gt; updateParticipant(index, 'interests', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Interests"
                /&gt;
              &lt;/div&gt;
              &lt;textarea
                value={participant.background}
                onChange={(e) =&gt; updateParticipant(index, 'background', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="Background information..."
                rows={2}
              /&gt;
            &lt;/div&gt;
          ))}
        &lt;/div&gt;

        {/* My Team */}
        &lt;div className="bg-white rounded-xl shadow-sm p-6 space-y-4"&gt;
          &lt;div className="flex items-center justify-between border-b pb-2"&gt;
            &lt;h2 className="text-lg font-semibold text-gray-900"&gt;My Team&lt;/h2&gt;
            &lt;button
              type="button"
              onClick={addTeamMember}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            &gt;
              &lt;Plus size={16} /&gt; Add Team Member
            &lt;/button&gt;
          &lt;/div&gt;
          
          {teamMembers.map((member, index) =&gt; (
            &lt;div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3"&gt;
              &lt;div className="flex items-center justify-between"&gt;
                &lt;span className="font-medium text-gray-700"&gt;Team Member {index + 1}&lt;/span&gt;
                {teamMembers.length &gt; 1 &amp;&amp; (
                  &lt;button
                    type="button"
                    onClick={() =&gt; removeTeamMember(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  &gt;
                    &lt;Trash2 size={16} /&gt;
                  &lt;/button&gt;
                )}
              &lt;/div&gt;
              &lt;div className="grid grid-cols-1 md:grid-cols-2 gap-3"&gt;
                &lt;input
                  type="text"
                  value={member.name}
                  onChange={(e) =&gt; updateTeamMember(index, 'name', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Name"
                /&gt;
                &lt;input
                  type="text"
                  value={member.position}
                  onChange={(e) =&gt; updateTeamMember(index, 'position', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Position"
                /&gt;
              &lt;/div&gt;
              &lt;textarea
                value={member.background}
                onChange={(e) =&gt; updateTeamMember(index, 'background', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="Background information..."
                rows={2}
              /&gt;
              &lt;VoiceRecorder
                label="Voice Sample (record how they speak)"
                existingUrl={member.voiceSampleUrl}
                onRecordingComplete={(url) =&gt; updateTeamMember(index, 'voiceSampleUrl', url)}
              /&gt;
            &lt;/div&gt;
          ))}
        &lt;/div&gt;

        {/* Concerns &amp; My Voice */}
        &lt;div className="bg-white rounded-xl shadow-sm p-6 space-y-4"&gt;
          &lt;h2 className="text-lg font-semibold text-gray-900 border-b pb-2"&gt;Additional Notes&lt;/h2&gt;
          
          &lt;div&gt;
            &lt;label className="block text-sm font-medium text-gray-700 mb-1"&gt;Concerns&lt;/label&gt;
            &lt;textarea
              value={form.concerns}
              onChange={(e) =&gt; setForm({ ...form, concerns: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="Any concerns or things to be aware of..."
              rows={3}
            /&gt;
          &lt;/div&gt;

          &lt;VoiceRecorder
            label="My Voice Sample (record how you communicate)"
            existingUrl={form.my_voice_sample_url}
            onRecordingComplete={(url) =&gt; setForm({ ...form, my_voice_sample_url: url })}
          /&gt;
        &lt;/div&gt;

        {/* Actions */}
        &lt;div className="flex justify-end gap-3"&gt;
          &lt;Link
            href="/dashboard/meetings"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
          &gt;
            Cancel
          &lt;/Link&gt;
          &lt;button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          &gt;
            {loading &amp;&amp; &lt;Loader2 className="animate-spin" size={16} /&gt;}
            {loading ? 'Creating...' : 'Create Meeting'}
          &lt;/button&gt;
        &lt;/div&gt;
      &lt;/form&gt;
    &lt;/div&gt;
  );
}
