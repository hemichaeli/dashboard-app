'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2, Mic, Square, Play, Pause, Users, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { meetingsApi } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

interface Participant {
  name: string;
  role: string;
  company: string;
  background: string;
  interests: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email?: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  projects: string[];
  goals: string[];
  members: TeamMember[];
}

interface VoiceRecorderProps {
  onRecordingComplete: (audioUrl: string) => void;
  onRecordingStop?: () => void;
  existingUrl?: string;
  label: string;
}

function VoiceRecorder({ onRecordingComplete, onRecordingStop, existingUrl, label }: VoiceRecorderProps) {
  const { t } = useLanguage();
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
        if (e.data.size > 0) chunksRef.current.push(e.data);
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
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert(t('microphoneError'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (onRecordingStop) onRecordingStop();
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
              <button type="button" onClick={startRecording} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                <Mic size={18} />
                {t('startRecording')}
              </button>
            ) : (
              <>
                <button type="button" onClick={stopRecording} className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors">
                  <Square size={18} />
                  {t('stop')}
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
            <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
            <button type="button" onClick={togglePlayback} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              {isPlaying ? t('pause') : t('play')}
            </button>
            <span className="text-gray-600 text-sm">{t('recordingSaved')}</span>
            <button type="button" onClick={deleteRecording} className="ml-auto p-2 text-red-500 hover:bg-red-50 rounded-lg">
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
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateTimeAutoSet, setDateTimeAutoSet] = useState(false);
  
  // Teams from Settings
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
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
  });

  const [participants, setParticipants] = useState<Participant[]>([
    { name: '', role: '', company: '', background: '', interests: '' }
  ]);

  // Load teams from localStorage (Settings)
  useEffect(() => {
    const savedTeams = localStorage.getItem('userTeams');
    if (savedTeams) {
      setAvailableTeams(JSON.parse(savedTeams));
    }
  }, []);

  // Update selected team when dropdown changes
  useEffect(() => {
    if (selectedTeamId) {
      const team = availableTeams.find(t => t.id === selectedTeamId);
      setSelectedTeam(team || null);
    } else {
      setSelectedTeam(null);
    }
  }, [selectedTeamId, availableTeams]);

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

  const addGoal = () => setForm({ ...form, goals: [...form.goals, ''] });
  const updateGoal = (index: number, value: string) => {
    const newGoals = [...form.goals];
    newGoals[index] = value;
    setForm({ ...form, goals: newGoals });
  };
  const removeGoal = (index: number) => {
    if (form.goals.length > 1) setForm({ ...form, goals: form.goals.filter((_, i) => i !== index) });
  };

  const addParticipant = () => setParticipants([...participants, { name: '', role: '', company: '', background: '', interests: '' }]);
  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const newParticipants = [...participants];
    newParticipants[index][field] = value;
    setParticipants(newParticipants);
  };
  const removeParticipant = (index: number) => {
    if (participants.length > 1) setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      setError(t('titleIsRequired'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Get user profile from localStorage
      const userProfile = localStorage.getItem('userProfile');
      const parsedProfile = userProfile ? JSON.parse(userProfile) : null;
      
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
          selected_team: selectedTeam,
          user_profile: parsedProfile,
        }),
      };
      const res = await meetingsApi.create(payload);
      router.push(`/dashboard/meetings/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || t('failedToCreateMeeting'));
      setLoading(false);
    }
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/meetings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <BackArrow size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('newMeetingTitle')}</h1>
          <p className="text-gray-500">{t('newMeetingSubtitle')}</p>
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
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">{t('basicInformation')}</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('titleRequired')}</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder={t('titlePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('subject')}</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder={t('subjectPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('date')} {dateTimeAutoSet && <span className="text-green-600 text-xs">{t('autoSet')}</span>}
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
                {t('startTime')} {dateTimeAutoSet && <span className="text-green-600 text-xs">{t('autoSet')}</span>}
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
                {t('endTime')} {dateTimeAutoSet && <span className="text-green-600 text-xs">{t('autoSet')}</span>}
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
            <p className="text-sm text-green-600">✓ {t('dateTimeAutoSet')}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('location')}</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder={t('locationPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('meetingLink')}</label>
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

        {/* Select Team from Settings */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users size={20} />
              {t('selectTeam')}
            </h2>
            <Link href="/dashboard/settings" className="text-sm text-blue-600 hover:underline">
              {t('manageTeams')}
            </Link>
          </div>
          
          {availableTeams.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <Users size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">{t('noTeamsYet')}</p>
              <Link href="/dashboard/settings" className="text-blue-600 hover:underline text-sm">
                {t('createTeamInSettings')}
              </Link>
            </div>
          ) : (
            <>
              <div className="relative">
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white appearance-none cursor-pointer"
                >
                  <option value="">{t('selectTeamPlaceholder')}</option>
                  {availableTeams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
                <ChevronDown size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* Show selected team details */}
              {selectedTeam && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900">{selectedTeam.name}</h3>
                  {selectedTeam.description && <p className="text-blue-700 text-sm mt-1">{selectedTeam.description}</p>}
                  
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {selectedTeam.members.filter(m => m.name).length > 0 && (
                      <div>
                        <p className="font-medium text-blue-800">{t('members')}:</p>
                        <ul className="text-blue-700">
                          {selectedTeam.members.filter(m => m.name).map(m => (
                            <li key={m.id}>{m.name} {m.role && `(${m.role})`}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedTeam.projects.filter(p => p).length > 0 && (
                      <div>
                        <p className="font-medium text-blue-800">{t('projects')}:</p>
                        <ul className="text-blue-700">
                          {selectedTeam.projects.filter(p => p).map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedTeam.goals.filter(g => g).length > 0 && (
                      <div>
                        <p className="font-medium text-blue-800">{t('goals')}:</p>
                        <ul className="text-blue-700">
                          {selectedTeam.goals.filter(g => g).map((g, i) => (
                            <li key={i}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Goals */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-semibold text-gray-900">{t('meetingGoals')}</h2>
            <button type="button" onClick={addGoal} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
              <Plus size={16} /> {t('addGoal')}
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
                placeholder={`${t('goal')} ${index + 1}`}
              />
              {form.goals.length > 1 && (
                <button type="button" onClick={() => removeGoal(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Participants (Other side) */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-semibold text-gray-900">{t('participantsTitle')}</h2>
            <button type="button" onClick={addParticipant} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
              <Plus size={16} /> {t('addParticipant')}
            </button>
          </div>
          <p className="text-sm text-gray-500">{t('participantsDescription')}</p>
          
          {participants.map((participant, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">{t('participant')} {index + 1}</span>
                {participants.length > 1 && (
                  <button type="button" onClick={() => removeParticipant(index)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" value={participant.name} onChange={(e) => updateParticipant(index, 'name', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" placeholder={t('name')} />
                <input type="text" value={participant.role} onChange={(e) => updateParticipant(index, 'role', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" placeholder={t('rolePlaceholder')} />
                <input type="text" value={participant.company} onChange={(e) => updateParticipant(index, 'company', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" placeholder={t('company')} />
                <input type="text" value={participant.interests} onChange={(e) => updateParticipant(index, 'interests', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" placeholder={t('interests')} />
              </div>
              <textarea value={participant.background} onChange={(e) => updateParticipant(index, 'background', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" placeholder={t('backgroundPlaceholder')} rows={2} />
              <VoiceRecorder label={t('voiceSampleParticipant')} existingUrl="" onRecordingComplete={(url) => {}} />
            </div>
          ))}
        </div>

        {/* Additional Notes (No voice recording) */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">{t('additionalNotes')}</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('concerns')}</label>
            <textarea
              value={form.concerns}
              onChange={(e) => setForm({ ...form, concerns: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder={t('concernsPlaceholder')}
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className={`flex gap-3 ${isRTL ? 'justify-start' : 'justify-end'}`}>
          <Link href="/dashboard/meetings" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium">
            {t('cancel')}
          </Link>
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
            {loading && <Loader2 className="animate-spin" size={16} />}
            {loading ? t('creating') : t('createMeeting')}
          </button>
        </div>
      </form>
    </div>
  );
}
