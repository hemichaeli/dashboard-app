'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const [aiError, setAiError] = useState<string | null>(null);
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

  const analyzeLieStatus = (text: string, analysisResult: AnalysisResult | null): { status: 'truthful' | 'suspicious' | 'lying' | 'unknown', confidence: number } => {
    if (!analysisResult) return { status: 'unknown', confidence: 0 };
    
    const { status, confidence } = analysisResult.lieDetector;
    const suspiciousKeywords = ['בטוח', 'מבטיח', 'לעולם לא', 'תמיד', 'אף פעם', 'absolutely', 'never', 'always', 'promise', 'trust me', 'honestly', 'believe me'];
    const hasKeyword = suspiciousKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
    
    if (status === 'suspicious' && confidence > 70) return { status: 'lying', confidence };
    else if (status === 'suspicious' || hasKeyword) return { status: 'suspicious', confidence: Math.max(confidence, 50) };
    else if (status === 'truthful') return { status: 'truthful', confidence };
    return { status: 'unknown', confidence: 0 };
  };

  const runAnalysis = useCallback(async () => {
    if (transcript.length === 0 || transcript.length === lastAnalyzedLength) return;
    
    setAnalyzing(true);
    setAiError(null);
    try {
      const transcriptTexts = transcript.map(t => t.text);
      const response = await aiApi.analyze(transcriptTexts, getMeetingContext(), analysis || undefined);
      setAnalysis(response.data);
      setLastAnalyzedLength(transcript.length);
      
      setTranscript(prev => prev.map((entry, idx) => {
        if (idx >= lastAnalyzedLength - 3) {
          const lieResult = analyzeLieStatus(entry.text, response.data);
          return { ...entry, lieStatus: lieResult.status, lieConfidence: lieResult.confidence };
        }
        return entry;
      }));
    } catch (error: any) {
      console.error('AI Analysis failed:', error);
      setAiError(error.response?.data?.error || error.message || 'AI analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }, [transcript, lastAnalyzedLength, getMeetingContext, analysis]);

  useEffect(() => {
    if (isListening && transcript.length > 0) {
      if (transcript.length > lastAnalyzedLength && !analyzing) runAnalysis();
      analysisIntervalRef.current = setInterval(() => {
        if (transcript.length > lastAnalyzedLength && !analyzing) runAnalysis();
      }, 10000);
    }
    return () => { if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current); };
  }, [isListening, transcript, lastAnalyzedLength, analyzing, runAnalysis]);

  const startListening = async () => {
    setMeetingStarted(true);
    setIsListening(true);
    setAiError(null);

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
          const newEntry: TranscriptEntry = { text: newText, timestamp: new Date(), lieStatus: 'unknown', lieConfidence: 0 };
          setTranscript(prev => [...prev, newEntry]);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') alert('Microphone access denied.');
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

    // Initial analysis
    setAnalyzing(true);
    try {
      const response = await aiApi.analyze(['Meeting started...'], getMeetingContext());
      setAnalysis(response.data);
    } catch (error: any) {
      console.error('Initial analysis failed:', error);
      setAiError(error.response?.data?.error || 'Failed to connect to AI service');
      // Provide fallback analysis
      setAnalysis({
        suggestions: ['Waiting for AI service...', 'Check your connection', 'Try refreshing the page'],
        goalProgress: meeting?.goals?.map(g => ({ goal: g, progress: 'Not Started', tips: 'Waiting for analysis' })) || [],
        otherSideAnalysis: { mood: 'Unknown', moodScore: 50, tone: 'Not detected', engagement: 'Waiting for data', concerns: [] },
        lieDetector: { confidence: 0, indicators: ['Waiting for speech...'], status: 'truthful' },
        keyInsights: ['Meeting started', 'Waiting for conversation...'],
        nextMoves: ['Start speaking', 'AI will analyze in real-time']
      });
    } finally {
      setAnalyzing(false);
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

  const getLieTextColor = (status: string, confidence: number) => {
    if (status === 'lying' || (status === 'suspicious' && confidence > 70)) return 'text-red-400 font-semibold';
    else if (status === 'suspicious') return 'text-orange-400';
    return 'text-gray-300';
  };

  const getLieBadge = (status: string, confidence: number) => {
    if (status === 'lying' || (status === 'suspicious' && confidence > 70)) {
      return <span className="ml-2 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">⚠️ שקר</span>;
    } else if (status === 'suspicious') {
      return <span className="ml-2 px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full">🤔 חשוד</span>;
    }
    return null;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#101622] flex items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-4xl text-[#135bec]">progress_activity</span>
    </div>
  );
  
  if (!meeting) return null;

  const getStatusBadge = (status: string) => {
    switch (status) { 
      case 'upcoming': return 'badge-pending'; 
      case 'completed': return 'badge-analyzed'; 
      default: return 'badge-processing'; 
    }
  };

  const getLieDetectorColor = (status: string) => {
    switch (status) {
      case 'truthful': return 'bg-green-900/30 text-green-400';
      case 'suspicious': return 'bg-red-900/30 text-red-400';
      default: return 'bg-yellow-900/30 text-yellow-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#101622] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#101622]/90 backdrop-blur-md border-b border-gray-800/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/meetings" className="p-2 hover:bg-[#1c2536] rounded-lg transition-colors">
              <span className="material-symbols-outlined text-gray-300">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">{meeting.title}</h1>
              <p className="text-sm text-gray-400">{meeting.subject}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('px-3 py-1 rounded-full text-xs font-medium', getStatusBadge(meeting.status))}>
              {meeting.status}
            </span>
            <button onClick={handleDelete} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Meeting Info Card */}
        <div className="bg-[#1c2536] rounded-2xl border border-gray-800 p-4">
          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            {meeting.date && (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#135bec]">calendar_today</span>
                <span>{formatDate(meeting.date)}</span>
              </div>
            )}
            {meeting.time && (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#135bec]">schedule</span>
                <span>{formatTime(meeting.time)}{meeting.end_time && ` - ${formatTime(meeting.end_time)}`}</span>
              </div>
            )}
            {meeting.location && (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#135bec]">location_on</span>
                <span>{meeting.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Link 
            href={`/dashboard/meetings/${meeting.id}/edit`} 
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1c2536] border border-gray-800 text-white rounded-xl hover:bg-[#252f42] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
            <span className="font-medium">Edit</span>
          </Link>
          
          {!meetingStarted ? (
            <button 
              onClick={startListening} 
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-600/25"
            >
              <span className="material-symbols-outlined text-[20px]">play_arrow</span>
              <span className="font-medium">Start Meeting</span>
            </button>
          ) : (
            <div className="flex-1 flex gap-2">
              {isListening ? (
                <button 
                  onClick={stopListening} 
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">pause</span>
                  <span className="font-medium">Pause</span>
                </button>
              ) : (
                <button 
                  onClick={startListening} 
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                  <span className="font-medium">Resume</span>
                </button>
              )}
              <button 
                onClick={endMeeting} 
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">stop</span>
                <span className="font-medium">End</span>
              </button>
            </div>
          )}
        </div>

        {/* Listening Indicator */}
        {isListening && (
          <div className="flex items-center gap-4 p-4 bg-[#135bec]/10 border border-[#135bec]/30 rounded-xl">
            <div className="relative">
              <span className="material-symbols-outlined text-[32px] text-[#135bec] animate-pulse">hearing</span>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">מאזין לפגישה...</p>
              <p className="text-sm text-gray-400">
                {transcript.length} משפטים נקלטו | AI מנתח בזמן אמת
                {analyzing && <span className="material-symbols-outlined animate-spin ml-2 text-[14px]">progress_activity</span>}
              </p>
            </div>
            <button 
              onClick={runAnalysis} 
              disabled={analyzing} 
              className="flex items-center gap-2 px-4 py-2 bg-[#135bec] text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <span className={cn("material-symbols-outlined text-[16px]", analyzing && "animate-spin")}>refresh</span>
              נתח עכשיו
            </button>
          </div>
        )}

        {/* AI Error */}
        {aiError && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-center gap-2 text-red-400">
              <span className="material-symbols-outlined">error</span>
              <span className="font-medium">AI Error: {aiError}</span>
            </div>
          </div>
        )}

        {/* Meeting Brief */}
        {!meetingStarted && (
          <div className="bg-[#1c2536] rounded-2xl border border-gray-800 p-5">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#135bec]">description</span>
              Meeting Brief
            </h3>
            
            <div className="space-y-4">
              {meeting.goals && meeting.goals.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-blue-400">target</span>
                    Goals
                  </h4>
                  <ul className="space-y-2">
                    {meeting.goals.map((goal, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-400">
                        <span className="text-[#135bec]">•</span>
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {additionalNotes?.concerns && (
                <div>
                  <h4 className="font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-orange-400">warning</span>
                    Concerns
                  </h4>
                  <p className="text-gray-400">{additionalNotes.concerns}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Real-time Analysis Panels */}
        {meetingStarted && analysis && (
          <div className="space-y-4">
            {/* Suggestions */}
            <div className="bg-[#1c2536] rounded-2xl border border-gray-800 p-5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-400">lightbulb</span>
                הצעות ורעיונות
                {analyzing && <span className="material-symbols-outlined animate-spin text-[16px] text-gray-400">progress_activity</span>}
              </h3>
              <div className="space-y-3">
                {analysis.suggestions.map((suggestion, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-yellow-500/10 rounded-lg">
                    <span className="text-yellow-400 font-bold">{i + 1}.</span>
                    <p className="text-gray-300">{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Goal Progress */}
            <div className="bg-[#1c2536] rounded-2xl border border-gray-800 p-5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">target</span>
                התקדמות מטרות
              </h3>
              <div className="space-y-3">
                {analysis.goalProgress.map((item, i) => (
                  <div key={i} className="p-3 bg-blue-500/10 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-white">{item.goal}</span>
                      <span className={cn('text-xs px-2 py-1 rounded',
                        item.progress === 'Achieved' ? 'bg-green-500/20 text-green-400' :
                        item.progress === 'Almost' ? 'bg-blue-500/20 text-blue-400' :
                        item.progress === 'In Progress' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-700 text-gray-400'
                      )}>{item.progress}</span>
                    </div>
                    <p className="text-sm text-gray-400">{item.tips}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Lie Detector */}
            <div className="bg-[#1c2536] rounded-2xl border border-gray-800 p-5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-400">visibility</span>
                גלאי אמינות
              </h3>
              <div className={cn('p-4 rounded-lg mb-4', getLieDetectorColor(analysis.lieDetector.status))}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold">
                    {analysis.lieDetector.status === 'truthful' ? '✅ אמין' : 
                     analysis.lieDetector.status === 'suspicious' ? '⚠️ חשוד' : '🤔 לא ברור'}
                  </span>
                  <span className="text-2xl font-bold">{analysis.lieDetector.confidence}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className={cn('h-2 rounded-full transition-all duration-500', 
                    analysis.lieDetector.status === 'truthful' ? 'bg-green-500' :
                    analysis.lieDetector.status === 'suspicious' ? 'bg-red-500' : 'bg-yellow-500'
                  )} style={{ width: `${analysis.lieDetector.confidence}%` }}></div>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">אינדיקטורים:</p>
                <ul className="space-y-1">
                  {analysis.lieDetector.indicators.map((indicator, i) => (
                    <li key={i} className="text-gray-400 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px] text-green-400">check_circle</span>
                      {indicator}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Next Moves */}
            <div className="bg-[#1c2536] rounded-2xl border border-gray-800 p-5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-400">trending_up</span>
                המהלכים הבאים
              </h3>
              <div className="space-y-2">
                {analysis.nextMoves.map((move, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-green-500/10 rounded-lg">
                    <span className="text-green-400 font-bold">{i + 1}.</span>
                    <p className="text-gray-300">{move}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Insights */}
            <div className="bg-[#1c2536] rounded-2xl border border-gray-800 p-5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400">psychology</span>
                תובנות מפתח
              </h3>
              <div className="space-y-2">
                {analysis.keyInsights.map((insight, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-indigo-500/10 rounded-lg">
                    <span className="text-indigo-400">•</span>
                    <p className="text-gray-300">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Transcript */}
            {transcript.length > 0 && (
              <div className="bg-[#1c2536] rounded-2xl border border-gray-800 p-5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-400">chat</span>
                  תמלול חי
                  <span className="text-xs font-normal text-gray-500 mr-4">(🔴 שקר | 🟠 חשוד)</span>
                </h3>
                <div className="max-h-64 overflow-y-auto space-y-3 bg-[#101622] p-4 rounded-lg">
                  {transcript.map((entry, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        'p-3 rounded-lg border-r-4 transition-all',
                        entry.lieStatus === 'lying' || (entry.lieStatus === 'suspicious' && entry.lieConfidence > 70)
                          ? 'bg-red-500/10 border-red-500' 
                          : entry.lieStatus === 'suspicious' 
                          ? 'bg-orange-500/10 border-orange-400'
                          : 'bg-[#1c2536] border-gray-700'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <p className={cn('flex-1', getLieTextColor(entry.lieStatus, entry.lieConfidence))}>
                          <span className="text-gray-500 text-sm ml-2">[{i + 1}]</span>
                          {entry.text}
                          {getLieBadge(entry.lieStatus, entry.lieConfidence)}
                        </p>
                        <span className="text-xs text-gray-500 mr-2">
                          {entry.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Participants & Tasks Tabs */}
        {!meetingStarted && (
          <div className="bg-[#1c2536] rounded-2xl border border-gray-800 overflow-hidden">
            <div className="border-b border-gray-800">
              <nav className="flex">
                {(['participants', 'tasks'] as const).map((tab) => (
                  <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)} 
                    className={cn(
                      'flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                      activeTab === tab 
                        ? 'border-[#135bec] text-[#135bec]' 
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    )}
                  >
                    {tab === 'participants' ? `Participants (${meeting.participants?.length || 0})` : `Tasks (${meeting.tasks?.length || 0})`}
                  </button>
                ))}
              </nav>
            </div>
            <div className="p-5">
              {activeTab === 'participants' && (
                <div className="space-y-3">
                  {!meeting.participants?.length ? (
                    <p className="text-gray-500 text-center py-8">No participants added yet</p>
                  ) : (
                    meeting.participants.map((p) => (
                      <div key={p.id} className="p-4 bg-[#101622] rounded-lg">
                        <div className="font-medium text-white">{p.name}</div>
                        {p.email && <div className="text-sm text-gray-500">{p.email}</div>}
                        {p.role && <div className="text-sm text-gray-400 mt-1">{p.role}{p.company && ` at ${p.company}`}</div>}
                      </div>
                    ))
                  )}
                </div>
              )}
              {activeTab === 'tasks' && (
                <div className="space-y-3">
                  {!meeting.tasks?.length ? (
                    <p className="text-gray-500 text-center py-8">No tasks added yet</p>
                  ) : (
                    meeting.tasks.map((t) => (
                      <div key={t.id} className="p-4 bg-[#101622] rounded-lg">
                        <div className="font-medium text-white">{t.title}</div>
                        {t.description && <div className="text-sm text-gray-400 mt-1">{t.description}</div>}
                        <div className="flex gap-2 mt-2">
                          <span className={cn('px-2 py-0.5 rounded text-xs', 
                            t.status === 'completed' ? 'bg-green-500/20 text-green-400' : 
                            t.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' : 
                            'bg-gray-700 text-gray-400'
                          )}>{t.status}</span>
                          <span className={cn('px-2 py-0.5 rounded text-xs', 
                            t.priority === 'high' ? 'bg-red-500/20 text-red-400' : 
                            t.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 
                            'bg-green-500/20 text-green-400'
                          )}>{t.priority}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#101622]/95 backdrop-blur-lg border-t border-gray-800 pb-safe z-50">
        <div className="flex items-center justify-around h-16 px-2">
          <Link href="/dashboard" className="flex flex-1 flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-300">
            <span className="material-symbols-outlined text-[24px]">dashboard</span>
            <span className="text-[10px] font-medium">Overview</span>
          </Link>
          <Link href="/dashboard/meetings" className="flex flex-1 flex-col items-center justify-center gap-1 text-[#135bec]">
            <span className="material-symbols-outlined icon-filled text-[24px]">calendar_today</span>
            <span className="text-[10px] font-semibold">Meetings</span>
          </Link>
          <div className="flex flex-1 flex-col items-center justify-center -mt-8">
            <Link href="/dashboard/meetings/new" className="w-14 h-14 rounded-full bg-[#135bec] text-white shadow-lg shadow-[#135bec]/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">add</span>
            </Link>
          </div>
          <Link href="/dashboard/analytics" className="flex flex-1 flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-300">
            <span className="material-symbols-outlined text-[24px]">analytics</span>
            <span className="text-[10px] font-medium">Analysis</span>
          </Link>
          <Link href="/dashboard/settings" className="flex flex-1 flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-300">
            <span className="material-symbols-outlined text-[24px]">settings</span>
            <span className="text-[10px] font-medium">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
