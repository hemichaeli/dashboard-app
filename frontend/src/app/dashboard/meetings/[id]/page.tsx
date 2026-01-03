'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Calendar, Clock, MapPin, Link as LinkIcon, 
  Trash2, Edit2, Play, Square, Ear, Target, Brain, 
  TrendingUp, AlertTriangle, Lightbulb, Users, MessageSquare,
  Activity, Eye, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { meetingsApi } from '@/lib/api';
import { Meeting } from '@/types';
import { formatDate, formatTime, cn } from '@/lib/utils';

interface AnalysisData {
  suggestions: string[];
  goalProgress: { goal: string; progress: string; tips: string }[];
  otherSideAnalysis: {
    mood: string;
    moodScore: number;
    tone: string;
    engagement: string;
    concerns: string[];
  };
  lieDetector: {
    confidence: number;
    indicators: string[];
    status: 'truthful' | 'uncertain' | 'suspicious';
  };
  keyInsights: string[];
  nextMoves: string[];
}

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'brief' | 'participants' | 'tasks'>('brief');
  const [isListening, setIsListening] = useState(false);
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const res = await meetingsApi.getById(params.id as string);
        setMeeting(res.data);
      } catch (error) { 
        console.error('Failed to fetch meeting:', error); 
        router.push('/dashboard/meetings'); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchMeeting();
  }, [params.id, router]);

  // Parse additional_notes JSON
  const parseAdditionalNotes = (notes: string | undefined) => {
    if (!notes) return null;
    try {
      return JSON.parse(notes);
    } catch {
      return { raw: notes };
    }
  };

  const startListening = () => {
    setMeetingStarted(true);
    setIsListening(true);
    
    // Initialize mock analysis (in production, this would connect to real AI)
    setAnalysis({
      suggestions: [
        'Consider addressing budget concerns early in the conversation',
        'The participant seems interested in timeline - be prepared with dates',
        'Build rapport before diving into technical details'
      ],
      goalProgress: meeting?.goals?.map(goal => ({
        goal,
        progress: 'In Progress',
        tips: 'Keep steering the conversation toward this objective'
      })) || [],
      otherSideAnalysis: {
        mood: 'Engaged',
        moodScore: 75,
        tone: 'Professional, slightly cautious',
        engagement: 'High - asking follow-up questions',
        concerns: ['Budget constraints', 'Implementation timeline']
      },
      lieDetector: {
        confidence: 85,
        indicators: ['Consistent eye contact patterns', 'Natural speech rhythm'],
        status: 'truthful'
      },
      keyInsights: [
        'Decision maker is present and attentive',
        'Budget was mentioned 3 times - key concern',
        'Positive body language when discussing features'
      ],
      nextMoves: [
        'Present ROI analysis to address budget concerns',
        'Offer flexible payment terms',
        'Schedule follow-up demo with technical team'
      ]
    });

    // Try to use Web Speech API for real transcription
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        if (result.isFinal) {
          setTranscript(prev => [...prev, result[0].transcript]);
        }
      };
      
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const endMeeting = () => {
    setMeetingStarted(false);
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;
    try {
      await meetingsApi.delete(params.id as string);
      router.push('/dashboard/meetings');
    } catch (error) { 
      console.error('Failed to delete meeting:', error); 
    }
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
  
  if (!meeting) return null;

  const additionalNotes = parseAdditionalNotes(meeting.additional_notes);

  const getStatusColor = (status: string) => {
    switch (status) { 
      case 'upcoming': return 'bg-blue-100 text-blue-800'; 
      case 'completed': return 'bg-green-100 text-green-800'; 
      case 'cancelled': return 'bg-red-100 text-red-800'; 
      default: return 'bg-gray-100 text-gray-800'; 
    }
  };

  const getLieDetectorColor = (status: string) => {
    switch (status) {
      case 'truthful': return 'text-green-600 bg-green-50';
      case 'suspicious': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/meetings" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
            <p className="text-gray-500">{meeting.subject}</p>
          </div>
          <span className={cn('px-3 py-1 rounded-full text-sm font-medium', getStatusColor(meeting.status))}>
            {meeting.status}
          </span>
        </div>
        <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">
          <Trash2 size={16} />Delete
        </button>
      </div>

      {/* Meeting Info */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar size={18} />
            <span>{formatDate(meeting.date)}</span>
          </div>
          {meeting.time && (
            <div className="flex items-center gap-2">
              <Clock size={18} />
              <span>{formatTime(meeting.time)}{meeting.end_time && ` - ${formatTime(meeting.end_time)}`}</span>
            </div>
          )}
          {meeting.location && (
            <div className="flex items-center gap-2">
              <MapPin size={18} />
              <span>{meeting.location}</span>
            </div>
          )}
          {meeting.meeting_link && (
            <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
              <LinkIcon size={18} />Join Meeting
            </a>
          )}
        </div>
      </div>

      {/* Meeting Brief with Action Buttons */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Meeting Brief</h2>
          <div className="flex gap-3">
            <Link 
              href={`/dashboard/meetings/${meeting.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <Edit2 size={18} />
              Edit
            </Link>
            {!meetingStarted ? (
              <button
                onClick={startListening}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Play size={18} />
                Start
              </button>
            ) : (
              <>
                {isListening ? (
                  <button
                    onClick={stopListening}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                  >
                    <Square size={18} />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={startListening}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Play size={18} />
                    Resume
                  </button>
                )}
                <button
                  onClick={endMeeting}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Square size={18} />
                  End
                </button>
              </>
            )}
          </div>
        </div>

        {/* Listening Indicator */}
        {isListening && (
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg mb-6">
            <div className="relative">
              <Ear size={32} className="text-blue-600 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
            </div>
            <div>
              <p className="font-medium text-blue-800">Listening to meeting...</p>
              <p className="text-sm text-blue-600">AI is analyzing the conversation in real-time</p>
            </div>
          </div>
        )}

        {/* Brief Content */}
        <div className="space-y-4">
          {meeting.goals && meeting.goals.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Target size={18} className="text-blue-600" />
                Goals
              </h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                {meeting.goals.map((goal, i) => <li key={i}>{goal}</li>)}
              </ul>
            </div>
          )}

          {additionalNotes?.concerns && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-500" />
                Concerns
              </h3>
              <p className="text-gray-600">{additionalNotes.concerns}</p>
            </div>
          )}

          {additionalNotes?.team_members && additionalNotes.team_members.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Users size={18} className="text-purple-600" />
                My Team
              </h3>
              <div className="space-y-2">
                {additionalNotes.team_members.map((member: any, i: number) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{member.name}</span>
                    {member.position && <span className="text-gray-500 ml-2">- {member.position}</span>}
                    {member.background && <p className="text-sm text-gray-600 mt-1">{member.background}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Analysis Panel (shown when meeting started) */}
      {meetingStarted && analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Suggestions & Ideas */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lightbulb size={20} className="text-yellow-500" />
              Suggestions & Ideas
            </h3>
            <div className="space-y-3">
              {analysis.suggestions.map((suggestion, i) => (
                <div key={i} className="flex gap-3 p-3 bg-yellow-50 rounded-lg">
                  <span className="text-yellow-600 font-bold">{i + 1}.</span>
                  <p className="text-base text-gray-700">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Goal Progress */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target size={20} className="text-blue-600" />
              Goal Achievement Progress
            </h3>
            <div className="space-y-3">
              {analysis.goalProgress.map((item, i) => (
                <div key={i} className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-gray-800">{item.goal}</span>
                    <span className="text-sm px-2 py-1 bg-blue-200 text-blue-800 rounded">{item.progress}</span>
                  </div>
                  <p className="text-base text-gray-600">{item.tips}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Other Side Analysis */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Brain size={20} className="text-purple-600" />
              Other Side Analysis
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600 mb-1">Mood</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-gray-800">{analysis.otherSideAnalysis.mood}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${analysis.otherSideAnalysis.moodScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600 mb-1">Tone</p>
                  <p className="text-base font-medium text-gray-800">{analysis.otherSideAnalysis.tone}</p>
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 mb-1">Engagement Level</p>
                <p className="text-base text-gray-800">{analysis.otherSideAnalysis.engagement}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-600 mb-2">Detected Concerns</p>
                <ul className="space-y-1">
                  {analysis.otherSideAnalysis.concerns.map((concern, i) => (
                    <li key={i} className="text-base text-gray-700 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-orange-500" />
                      {concern}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Lie Detector */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Eye size={20} className="text-green-600" />
              Authenticity Detector
            </h3>
            <div className={cn('p-4 rounded-lg mb-4', getLieDetectorColor(analysis.lieDetector.status))}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold capitalize">{analysis.lieDetector.status}</span>
                <span className="text-2xl font-bold">{analysis.lieDetector.confidence}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={cn('h-3 rounded-full', 
                    analysis.lieDetector.status === 'truthful' ? 'bg-green-500' :
                    analysis.lieDetector.status === 'suspicious' ? 'bg-red-500' : 'bg-yellow-500'
                  )}
                  style={{ width: `${analysis.lieDetector.confidence}%` }}
                ></div>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Indicators:</p>
              <ul className="space-y-1">
                {analysis.lieDetector.indicators.map((indicator, i) => (
                  <li key={i} className="text-base text-gray-700 flex items-center gap-2">
                    <ThumbsUp size={14} className="text-green-500" />
                    {indicator}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Key Insights */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity size={20} className="text-indigo-600" />
              Key Insights
            </h3>
            <div className="space-y-2">
              {analysis.keyInsights.map((insight, i) => (
                <div key={i} className="flex gap-3 p-3 bg-indigo-50 rounded-lg">
                  <span className="text-indigo-600">•</span>
                  <p className="text-base text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Next Moves */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-green-600" />
              Recommended Next Moves
            </h3>
            <div className="space-y-2">
              {analysis.nextMoves.map((move, i) => (
                <div key={i} className="flex gap-3 p-3 bg-green-50 rounded-lg">
                  <span className="text-green-600 font-bold">{i + 1}.</span>
                  <p className="text-base text-gray-700">{move}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs for Participants and Tasks (when meeting not started) */}
      {!meetingStarted && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="border-b">
            <nav className="flex">
              {(['participants', 'tasks'] as const).map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)} 
                  className={cn(
                    'px-6 py-4 text-sm font-medium border-b-2 transition-colors', 
                    activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  {tab === 'participants' ? `Participants (${meeting.participants?.length || 0})` : `Tasks (${meeting.tasks?.length || 0})`}
                </button>
              ))}
            </nav>
          </div>
          <div className="p-6">
            {activeTab === 'participants' && (
              <div className="space-y-4">
                {meeting.participants?.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No participants added yet</p>
                ) : (
                  meeting.participants?.map((p) => (
                    <div key={p.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{p.name}</div>
                        {p.email && <div className="text-sm text-gray-500">{p.email}</div>}
                        {p.role && <div className="text-sm text-gray-600 mt-1">{p.role}{p.company && ` at ${p.company}`}</div>}
                        {p.background && <div className="text-sm text-gray-500 mt-1">{p.background}</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                {meeting.tasks?.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No tasks added yet</p>
                ) : (
                  meeting.tasks?.map((t) => (
                    <div key={t.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{t.title}</div>
                        {t.description && <div className="text-sm text-gray-600 mt-1">{t.description}</div>}
                        <div className="flex gap-2 mt-2">
                          <span className={cn(
                            'px-2 py-0.5 rounded text-xs', 
                            t.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          )}>{t.status}</span>
                          <span className={cn(
                            'px-2 py-0.5 rounded text-xs', 
                            t.priority === 'high' ? 'bg-red-100 text-red-800' : 
                            t.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                          )}>{t.priority}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
