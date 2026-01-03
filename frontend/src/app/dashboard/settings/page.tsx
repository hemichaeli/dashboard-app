'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Lock, Users, Mic, Square, Play, Pause, Trash2, Plus, Save, Loader2, Building, Target, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';

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

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  background: string;
  voiceSample?: string;
}

export default function SettingsPage() {
  const { user, checkAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Profile state
  const [profileForm, setProfileForm] = useState<UserProfile>({
    name: '', email: '', phone: '', role: '', company: '', background: '', voiceSample: ''
  });
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Teams state
  const [teams, setTeams] = useState<Team[]>([]);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showTeamForm, setShowTeamForm] = useState(false);
  
  // Password state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || '',
        company: user.company || '',
        background: user.background || '',
        voiceSample: user.voiceSample || ''
      });
    }
    // Load teams from localStorage
    const savedTeams = localStorage.getItem('userTeams');
    if (savedTeams) {
      setTeams(JSON.parse(savedTeams));
    }
    // Load voice sample
    const savedVoice = localStorage.getItem('userVoiceSample');
    if (savedVoice) {
      setAudioURL(savedVoice);
    }
    // Load profile
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      setProfileForm(prev => ({ ...prev, ...JSON.parse(savedProfile) }));
    }
  }, [user]);

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        // Save to localStorage as base64
        const reader = new FileReader();
        reader.onloadend = () => {
          localStorage.setItem('userVoiceSample', reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      setMessage({ type: 'error', text: 'Could not access microphone. Please check permissions.' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = () => {
    if (audioURL && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    setAudioURL(null);
    localStorage.removeItem('userVoiceSample');
  };

  // Profile Functions
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      // Save to localStorage
      localStorage.setItem('userProfile', JSON.stringify(profileForm));
      // Also try to save to backend
      try {
        await authApi.updateProfile(profileForm);
        checkAuth();
      } catch {}
      setMessage({ type: 'success', text: 'Profile saved successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to save profile' });
    } finally {
      setLoading(false);
    }
  };

  // Team Functions
  const saveTeams = (newTeams: Team[]) => {
    setTeams(newTeams);
    localStorage.setItem('userTeams', JSON.stringify(newTeams));
  };

  const createNewTeam = () => {
    setEditingTeam({
      id: Date.now().toString(),
      name: '',
      description: '',
      projects: [''],
      goals: [''],
      members: [{ id: '1', name: '', role: '', email: '' }]
    });
    setShowTeamForm(true);
  };

  const editTeam = (team: Team) => {
    setEditingTeam({ ...team });
    setShowTeamForm(true);
  };

  const deleteTeam = (teamId: string) => {
    if (confirm('Are you sure you want to delete this team?')) {
      const newTeams = teams.filter(t => t.id !== teamId);
      saveTeams(newTeams);
    }
  };

  const saveTeam = () => {
    if (!editingTeam || !editingTeam.name.trim()) {
      setMessage({ type: 'error', text: 'Team name is required' });
      return;
    }
    
    const existingIndex = teams.findIndex(t => t.id === editingTeam.id);
    let newTeams: Team[];
    
    if (existingIndex >= 0) {
      newTeams = [...teams];
      newTeams[existingIndex] = editingTeam;
    } else {
      newTeams = [...teams, editingTeam];
    }
    
    saveTeams(newTeams);
    setShowTeamForm(false);
    setEditingTeam(null);
    setMessage({ type: 'success', text: 'Team saved successfully!' });
  };

  const addGoal = () => {
    if (editingTeam) {
      setEditingTeam({ ...editingTeam, goals: [...editingTeam.goals, ''] });
    }
  };

  const addProject = () => {
    if (editingTeam) {
      setEditingTeam({ ...editingTeam, projects: [...editingTeam.projects, ''] });
    }
  };

  const addMember = () => {
    if (editingTeam) {
      setEditingTeam({
        ...editingTeam,
        members: [...editingTeam.members, { id: Date.now().toString(), name: '', role: '', email: '' }]
      });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Password changed successfully' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'teams', label: 'My Teams', icon: Users },
    { id: 'security', label: 'Security', icon: Lock }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your profile, teams, and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs */}
        <div className="lg:w-64 bg-white rounded-xl shadow-sm p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMessage({ type: '', text: '' }); }}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={20} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl shadow-sm p-6">
          {message.text && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
              message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <h2 className="text-lg font-semibold">My Profile</h2>
              <p className="text-sm text-gray-500">This information will be used by the AI assistant during meetings</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role / Position</label>
                  <input
                    type="text"
                    value={profileForm.role}
                    onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Sales Manager, CEO"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={profileForm.company}
                    onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your company name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Background & Experience</label>
                <textarea
                  value={profileForm.background}
                  onChange={(e) => setProfileForm({ ...profileForm, background: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your professional background, expertise, and any relevant information the AI should know about you..."
                />
              </div>

              {/* Voice Sample */}
              <div className="border-t pt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Mic size={20} className="text-red-500" />
                  My Voice Sample
                </h3>
                <p className="text-sm text-gray-500 mb-4">Record a sample of your voice so the AI can identify you in meetings</p>
                
                <div className="flex items-center gap-4">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      <Mic size={18} />
                      Start Recording
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 animate-pulse"
                    >
                      <Square size={18} />
                      Stop Recording
                    </button>
                  )}
                  
                  {audioURL && (
                    <>
                      <button
                        type="button"
                        onClick={isPlaying ? pauseAudio : playAudio}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                        {isPlaying ? 'Pause' : 'Play'}
                      </button>
                      <button
                        type="button"
                        onClick={deleteRecording}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        <Trash2 size={18} />
                        Delete
                      </button>
                      <span className="text-green-600 text-sm">✓ Voice sample saved</span>
                    </>
                  )}
                </div>
                
                {audioURL && (
                  <audio
                    ref={audioRef}
                    src={audioURL}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Save Profile
              </button>
            </form>
          )}

          {/* Teams Tab */}
          {activeTab === 'teams' && !showTeamForm && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">My Teams</h2>
                  <p className="text-sm text-gray-500">Define your teams with their projects and goals. Select a team when creating a meeting.</p>
                </div>
                <button
                  onClick={createNewTeam}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus size={18} />
                  New Team
                </button>
              </div>

              {teams.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Users size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No teams yet</h3>
                  <p className="text-gray-500 mt-1">Create your first team to use in meetings</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {teams.map((team) => (
                    <div key={team.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                          {team.description && <p className="text-gray-600 text-sm mt-1">{team.description}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => editTeam(team)}
                            className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTeam(team.id)}
                            className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-700 flex items-center gap-1">
                            <Users size={14} /> Members ({team.members.filter(m => m.name).length})
                          </p>
                          <ul className="mt-1 text-gray-600">
                            {team.members.filter(m => m.name).slice(0, 3).map(m => (
                              <li key={m.id}>{m.name} {m.role && `- ${m.role}`}</li>
                            ))}
                            {team.members.filter(m => m.name).length > 3 && (
                              <li className="text-gray-400">+{team.members.filter(m => m.name).length - 3} more</li>
                            )}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 flex items-center gap-1">
                            <Building size={14} /> Projects ({team.projects.filter(p => p).length})
                          </p>
                          <ul className="mt-1 text-gray-600">
                            {team.projects.filter(p => p).slice(0, 3).map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 flex items-center gap-1">
                            <Target size={14} /> Goals ({team.goals.filter(g => g).length})
                          </p>
                          <ul className="mt-1 text-gray-600">
                            {team.goals.filter(g => g).slice(0, 3).map((g, i) => (
                              <li key={i}>{g}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Team Form */}
          {activeTab === 'teams' && showTeamForm && editingTeam && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                  {teams.find(t => t.id === editingTeam.id) ? 'Edit Team' : 'New Team'}
                </h2>
                <button
                  onClick={() => { setShowTeamForm(false); setEditingTeam(null); }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Name *</label>
                  <input
                    type="text"
                    value={editingTeam.name}
                    onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Sales Team, Product Development"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editingTeam.description}
                    onChange={(e) => setEditingTeam({ ...editingTeam, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of the team..."
                  />
                </div>

                {/* Team Members */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">Team Members</label>
                    <button type="button" onClick={addMember} className="text-blue-600 text-sm hover:underline">
                      + Add Member
                    </button>
                  </div>
                  {editingTeam.members.map((member, idx) => (
                    <div key={member.id} className="grid grid-cols-3 gap-2 mb-2">
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => {
                          const newMembers = [...editingTeam.members];
                          newMembers[idx] = { ...member, name: e.target.value };
                          setEditingTeam({ ...editingTeam, members: newMembers });
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
                        placeholder="Name"
                      />
                      <input
                        type="text"
                        value={member.role}
                        onChange={(e) => {
                          const newMembers = [...editingTeam.members];
                          newMembers[idx] = { ...member, role: e.target.value };
                          setEditingTeam({ ...editingTeam, members: newMembers });
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
                        placeholder="Role"
                      />
                      <input
                        type="email"
                        value={member.email || ''}
                        onChange={(e) => {
                          const newMembers = [...editingTeam.members];
                          newMembers[idx] = { ...member, email: e.target.value };
                          setEditingTeam({ ...editingTeam, members: newMembers });
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
                        placeholder="Email (optional)"
                      />
                    </div>
                  ))}
                </div>

                {/* Projects */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">Projects</label>
                    <button type="button" onClick={addProject} className="text-blue-600 text-sm hover:underline">
                      + Add Project
                    </button>
                  </div>
                  {editingTeam.projects.map((project, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={project}
                      onChange={(e) => {
                        const newProjects = [...editingTeam.projects];
                        newProjects[idx] = e.target.value;
                        setEditingTeam({ ...editingTeam, projects: newProjects });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm mb-2"
                      placeholder={`Project ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* Goals */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">Team Goals</label>
                    <button type="button" onClick={addGoal} className="text-blue-600 text-sm hover:underline">
                      + Add Goal
                    </button>
                  </div>
                  {editingTeam.goals.map((goal, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={goal}
                      onChange={(e) => {
                        const newGoals = [...editingTeam.goals];
                        newGoals[idx] = e.target.value;
                        setEditingTeam({ ...editingTeam, goals: newGoals });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm mb-2"
                      placeholder={`Goal ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={saveTeam}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save size={16} />
                  Save Team
                </button>
                <button
                  onClick={() => { setShowTeamForm(false); setEditingTeam(null); }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <h2 className="text-lg font-semibold">Change Password</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading && <Loader2 className="animate-spin" size={16} />}
                Update Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
