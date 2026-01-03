'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Calendar, Clock, MapPin, Link as LinkIcon, 
  Trash2, Edit2, Play, Square, Ear, Target, Brain, 
  TrendingUp, AlertTriangle, Lightbulb, Users, MessageSquare,
  Activity, Eye, ThumbsUp, Loader2, RefreshCw
} from 'lucide-react';
import { meetingsApi, aiApi, AnalysisResult, MeetingContext } from '@/lib/api';
import { Meeting } from '@/types';
import { formatDate, formatTime, cn } from '@/lib/utils';

interface TranscriptEntry {
  text: string;
  timestamp: Date;
  speaker?: string;
  lieStatus: 'truthful' | 'suspicious' | 'lying' | 'unknown';
  lieConfidence: number;
}

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'brief' | 'participants' | 'tasks'>('brief');
  const [isListening, setIsListening] = useState(false);
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [lastAnalyzedLength, setLastAnalyzedLength] = useState(0);
  const recognitionRef = useRef<any>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const parseAdditionalNotes = (notes: string | undefined) => {
    if (!notes) return null;
    try { return JSON.parse(notes); } catch { return { raw: notes }; }
  };

  const additionalNotes = meeting ? parseAdditionalNotes(meeting.additional_notes) : null;

  const getMeetingContext = useCallback((): MeetingContext => {
    return {
      title: meeting?.title || '',
      goals: meeting?.goals || [],
      participants: meeting?.participants?.map(p => ({ name: p.name, role: p.role || '', company: p.company || '' })) || [],
      teamMembers: additionalNotes?.team_members?.map((t: any) => ({ name: t.name, position: t.position || '' })) || [],
      concerns: additionalNotes?.concerns || ''
    };
  }, [meeting, additionalNotes]);

  // Analyze lie probability for each new transcript entry
  const analyzeLieStatus = (text: string, analysisResult: AnalysisResult | null): { status: 'truthful' | 'suspicious' | 'lying' | 'unknown', confidence: number } => {
    if (!analysisResult) return { status: 'unknown', confidence: 0 };
    
    // Use the overall lie detector status and confidence
    const { status, confidence } = analysisResult.lieDetector;
    
    // Keywords that might indicate deception
    const suspiciousKeywords = ['בטוח', 'מבטיח', 'לעולם לא', 'תמיד', 'אף פעם', 'absolutely', 'never', 'always', 'promise', 'trust me', 'honestly', 'to be honest', 'believe me'];
    const hasKeyword = suspiciousKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
    
    if (status === 'suspicious' && confidence > 70) {
      return { status: 'lying', confidence };
    } else if (status === 'suspicious' || hasKeyword) {
      return { status: 'suspicious', confidence: Math.max(confidence, 50) };
    } else if (status === 'truthful') {
      return { status: 'truthful', confidence };
    }
    return { status: 'unknown', confidence: 0 };
  };

  const runAnalysis = useCallback(async () => {
    if (transcript.length === 0 || transcript.length === lastAnalyzedLength) return;
    
    setAnalyzing(true);
    try {
      const transcriptTexts = transcript.map(t => t.text);
      const response = await aiApi.analyze(transcriptTexts, getMeetingContext(), analysis || undefined);
      setAnalysis(response.data);
      setLastAnalyzedLength(transcript.length);
      
      // Update lie status for recent entries based on new analysis
      setTranscript(prev => prev.map((entry, idx) => {
        if (idx >= lastAnalyzedLength - 3) { // Update last 3 entries
          const lieResult = analyzeLieStatus(entry.text, response.data);
          return { ...entry, lieStatus: lieResult.status, lieConfidence: lieResult.confidence };
        }
        return entry;
      }));
    } catch (error) {
      console.error('AI Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  }, [transcript, lastAnalyzedLength, getMeetingContext, analysis]);

  useEffect(() => {
    if (isListening && transcript.length > 0) {
      if (transcript.length > lastAnalyzedLength && !analyzing) {
        runAnalysis();
      }
      analysisIntervalRef.current = setInterval(() => {
        if (transcript.length > lastAnalyzedLength && !analyzing) {
          runAnalysis();
        }
      }, 10000);
    }
    return () => { if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current); };
  }, [isListening, transcript, lastAnalyzedLength, analyzing, runAnalysis]);

  const startListening = async () => {
    setMeetingStarted(true);
    setIsListening(true);

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'he-IL';
      
      recognitionRef.current.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        if (result.isFinal) {
          const newText = result[0].transcript;
          const newEntry: TranscriptEntry = {
            text: newText,
            timestamp: new Date(),
            lieStatus: 'unknown',
            lieConfidence: 0
          };
          setTranscript(prev => [...prev, newEntry]);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access.');
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening && recognitionRef.current) {
          try { recognitionRef.current.start(); } catch (e) { console.log('Recognition restart failed:', e); }
        }
      };
      
      try { recognitionRef.current.start(); } catch (e) { console.error('Failed to start speech recognition:', e); }
    } else {
      alert('Speech recognition is not supported in this browser. Please use Chrome.');
    }

    if (transcript.length === 0) {
      setAnalyzing(true);
      try {
        const response = await aiApi.analyze(['Meeting started...'], getMeetingContext());
        setAnalysis(response.data);
      } catch (error) {
        console.error('Initial analysis failed:', error);
        setAnalysis({
          suggestions: ['Waiting for conversation to begin...', 'Introduce your objectives early', 'Listen actively'],
          goalProgress: meeting?.goals?.map(g => ({ goal: g, progress: 'Not Started', tips: 'Steer conversation toward this goal' })) || [],
          otherSideAnalysis: { mood: 'Waiting', moodScore: 50, tone: 'Not yet detected', engagement: 'Meeting just started', concerns: [] },
          lieDetector: { confidence: 0, indicators: ['Waiting for speech...'], status: 'truthful' },
          keyInsights: ['Meeting has begun', 'Waiting for conversation data...'],
          nextMoves: ['Introduce yourself', 'Build rapport', 'Listen for key concerns']
        });
      } finally {
        setAnalyzing(false);
      }
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  const endMeeting = () => {
    setMeetingStarted(false);
    setIsListening(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;
    try {
      await meetingsApi.delete(params.id as string);
      router.push('/dashboard/meetings');
    } catch (error) { console.error('Failed to delete meeting:', error); }
  };

  // Get color class for lie status
  const getLieTextColor = (status: string, confidence: number) => {
    if (status === 'lying' || (status === 'suspicious' && confidence > 70)) {
      return 'text-red-600 font-semibold'; // Definitely lying - RED
    } else if (status === 'suspicious') {
      return 'text-orange-500'; // Probably lying - ORANGE
    }
    return 'text-gray-700'; // Normal
  };

  const getLieBadge = (status: string, confidence: number) => {
    if (status === 'lying' || (status === 'suspicious' && confidence > 70)) {
      return <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">⚠️ שקר</span>;
    } else if (status === 'suspicious') {
      return <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">🤔 חשוד</span>;
    }
    return null;
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
  
  if (!meeting) return null;

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
          <div className="flex items-center gap-2"><Calendar size={18} /><span>{formatDate(meeting.date)}</span></div>
          {meeting.time && <div className="flex items-center gap-2"><Clock size={18} /><span>{formatTime(meeting.time)}{meeting.end_time && ` - ${formatTime(meeting.end_time)}`}</span></div>}
          {meeting.location && <div className="flex items-center gap-2"><MapPin size={18} /><span>{meeting.location}</span></div>}
          {meeting.meeting_link && <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline"><LinkIcon size={18} />Join Meeting</a>}
        </div>
      </div>

      {/* Meeting Brief */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Meeting Brief</h2>
          <div className="flex gap-3">
            <Link href={`/dashboard/meetings/${meeting.id}/edit`} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
              <Edit2 size={18} />Edit
            </Link>
            {!meetingStarted ? (
              <button onClick={startListening} className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                <Play size={18} />Start
              </button>
            ) : (
              <>
                {isListening ? (
                  <button onClick={stopListening} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
                    <Square size={18} />Pause
                  </button>
                ) : (
                  <button onClick={startListening} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <Play size={18} />Resume
                  </button>
                )}
                <button onClick={endMeeting} className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  <Square size={18} />End
                </button>
              </>
            )}
          </div>
        </div>

        {isListening && (
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg mb-6">
            <div className="relative">
              <Ear size={32} className="text-blue-600 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-blue-800">מאזין לפגישה...</p>
              <p className="text-sm text-blue-600">
                {transcript.length} משפטים נקלטו | AI מנתח בזמן אמת
                {analyzing && <Loader2 className="inline ml-2 animate-spin" size={14} />}
              </p>
            </div>
            <button onClick={runAnalysis} disabled={analyzing} className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <RefreshCw size={14} className={analyzing ? 'animate-spin' : ''} />נתח עכשיו
            </button>
          </div>
        )}

        <div className="space-y-4">
          {meeting.goals && meeting.goals.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2"><Target size={18} className="text-blue-600" />Goals</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                {meeting.goals.map((goal, i) => <li key={i}>{goal}</li>)}
              </ul>
            </div>
          )}
          {additionalNotes?.concerns && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2"><AlertTriangle size={18} className="text-orange-500" />Concerns</h3>
              <p className="text-gray-600">{additionalNotes.concerns}</p>
            </div>
          )}
          {additionalNotes?.team_members && additionalNotes.team_members.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2"><Users size={18} className="text-purple-600" />My Team</h3>
              <div className="space-y-2">
                {additionalNotes.team_members.map((member: any, i: number) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{member.name}</span>
                    {member.position && <span className="text-gray-500 ml-2">- {member.position}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Analysis Panel */}
      {meetingStarted && analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Suggestions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lightbulb size={20} className="text-yellow-500" />הצעות ורעיונות
              {analyzing && <Loader2 className="animate-spin ml-2" size={16} />}
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
              <Target size={20} className="text-blue-600" />התקדמות מטרות
            </h3>
            <div className="space-y-3">
              {analysis.goalProgress.map((item, i) => (
                <div key={i} className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-gray-800">{item.goal}</span>
                    <span className={cn('text-sm px-2 py-1 rounded',
                      item.progress === 'Achieved' ? 'bg-green-200 text-green-800' :
                      item.progress === 'Almost' ? 'bg-blue-200 text-blue-800' :
                      item.progress === 'In Progress' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-gray-200 text-gray-800'
                    )}>{item.progress}</span>
                  </div>
                  <p className="text-base text-gray-600">{item.tips}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Other Side Analysis */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Brain size={20} className="text-purple-600" />ניתוח הצד השני
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600 mb-1">מצב רוח</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-gray-800">{analysis.otherSideAnalysis.mood}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full transition-all duration-500" style={{ width: `${analysis.otherSideAnalysis.moodScore}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600 mb-1">טון</p>
                  <p className="text-base font-medium text-gray-800">{analysis.otherSideAnalysis.tone}</p>
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 mb-1">רמת מעורבות</p>
                <p className="text-base text-gray-800">{analysis.otherSideAnalysis.engagement}</p>
              </div>
              {analysis.otherSideAnalysis.concerns.length > 0 && (
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-600 mb-2">חששות שזוהו</p>
                  <ul className="space-y-1">
                    {analysis.otherSideAnalysis.concerns.map((concern, i) => (
                      <li key={i} className="text-base text-gray-700 flex items-center gap-2">
                        <AlertTriangle size={14} className="text-orange-500" />{concern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Lie Detector */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Eye size={20} className="text-green-600" />גלאי אמינות
            </h3>
            <div className={cn('p-4 rounded-lg mb-4', getLieDetectorColor(analysis.lieDetector.status))}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold capitalize">
                  {analysis.lieDetector.status === 'truthful' ? '✅ אמין' : 
                   analysis.lieDetector.status === 'suspicious' ? '⚠️ חשוד' : '🤔 לא ברור'}
                </span>
                <span className="text-2xl font-bold">{analysis.lieDetector.confidence}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className={cn('h-3 rounded-full transition-all duration-500', 
                  analysis.lieDetector.status === 'truthful' ? 'bg-green-500' :
                  analysis.lieDetector.status === 'suspicious' ? 'bg-red-500' : 'bg-yellow-500'
                )} style={{ width: `${analysis.lieDetector.confidence}%` }}></div>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">אינדיקטורים:</p>
              <ul className="space-y-1">
                {analysis.lieDetector.indicators.map((indicator, i) => (
                  <li key={i} className="text-base text-gray-700 flex items-center gap-2">
                    <ThumbsUp size={14} className="text-green-500" />{indicator}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Key Insights */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity size={20} className="text-indigo-600" />תובנות מפתח
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

          {/* Next Moves */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-green-600" />המהלכים הבאים
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

          {/* Live Transcript with Lie Detection Colors */}
          {transcript.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare size={20} className="text-gray-600" />
                תמלול חי
                <span className="text-sm font-normal text-gray-500 mr-4">
                  (🔴 אדום = שקר | 🟠 כתום = חשוד)
                </span>
              </h3>
              <div className="max-h-64 overflow-y-auto space-y-3 bg-gray-50 p-4 rounded-lg">
                {transcript.map((entry, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      'p-3 rounded-lg border-r-4 transition-all',
                      entry.lieStatus === 'lying' || (entry.lieStatus === 'suspicious' && entry.lieConfidence > 70)
                        ? 'bg-red-50 border-red-500' 
                        : entry.lieStatus === 'suspicious' 
                        ? 'bg-orange-50 border-orange-400'
                        : 'bg-white border-gray-200'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <p className={cn('flex-1', getLieTextColor(entry.lieStatus, entry.lieConfidence))}>
                        <span className="text-gray-400 text-sm ml-2">[{i + 1}]</span>
                        {entry.text}
                        {getLieBadge(entry.lieStatus, entry.lieConfidence)}
                      </p>
                      <span className="text-xs text-gray-400 mr-2">
                        {entry.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {(entry.lieStatus === 'lying' || (entry.lieStatus === 'suspicious' && entry.lieConfidence > 70)) && (
                      <p className="text-xs text-red-600 mt-1">⚠️ זוהתה אי-התאמה או אינדיקציה לחוסר אמינות</p>
                    )}
                    {entry.lieStatus === 'suspicious' && entry.lieConfidence <= 70 && (
                      <p className="text-xs text-orange-600 mt-1">🤔 ייתכן חוסר דיוק - שים לב</p>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Legend */}
              <div className="mt-4 flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-red-500 rounded"></span>
                  <span>שקר בוודאות</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-orange-400 rounded"></span>
                  <span>כנראה משקר</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-gray-200 rounded"></span>
                  <span>אמין / לא זוהה</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs for Participants and Tasks */}
      {!meetingStarted && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="border-b">
            <nav className="flex">
              {(['participants', 'tasks'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={cn('px-6 py-4 text-sm font-medium border-b-2 transition-colors', activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
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
                          <span className={cn('px-2 py-0.5 rounded text-xs', t.status === 'completed' ? 'bg-green-100 text-green-800' : t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800')}>{t.status}</span>
                          <span className={cn('px-2 py-0.5 rounded text-xs', t.priority === 'high' ? 'bg-red-100 text-red-800' : t.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800')}>{t.priority}</span>
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
