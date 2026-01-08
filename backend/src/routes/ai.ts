import express from 'express';
import OpenAI from 'openai';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Check if API key exists
const apiKey = process.env.OPENAI_API_KEY;
console.log(`[AI] OpenAI API Key configured: ${apiKey ? 'YES (length: ' + apiKey.length + ')' : 'NO - MISSING!'}`);

const openai = apiKey ? new OpenAI({ apiKey }) : null;

// Model to use for AI analysis - GPT-4o-mini is fast and cost-effective
const AI_MODEL = 'gpt-4o-mini';

interface MeetingContext {
  title: string;
  subject?: string;
  goals: string[];
  participants: { name: string; role: string; company: string; background?: string }[];
  teamMembers: { name: string; position: string }[];
  concerns: string;
  myProfile?: { name: string; role: string; company: string; background: string };
  selectedTeam?: { name: string; description: string; members: { name: string; role: string }[] };
}

interface AnalysisRequest {
  transcript: string[];
  meetingContext: MeetingContext;
  previousAnalysis?: any;
}

// Health check for AI service (no auth required)
router.get('/health', (req, res) => {
  const status = {
    status: openai ? 'ok' : 'degraded',
    aiConfigured: !!openai,
    apiKeyPresent: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    model: AI_MODEL,
    timestamp: new Date().toISOString()
  };
  console.log('[AI] Health check:', status);
  res.json(status);
});

// Test AI connection (no auth required for debugging)
router.get('/test', async (req, res) => {
  console.log('[AI] Test endpoint called');
  
  if (!openai) {
    return res.status(503).json({ 
      error: 'AI service not configured',
      details: 'OpenAI API key is missing',
      apiKeyPresent: !!apiKey
    });
  }

  try {
    console.log('[AI] Testing OpenAI connection...');
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: 'Say "AI is working" in Hebrew' }],
      max_tokens: 50,
    });
    
    const result = response.choices[0]?.message?.content || 'No response';
    console.log('[AI] Test successful:', result);
    
    res.json({ 
      status: 'ok', 
      message: result,
      model: AI_MODEL
    });
  } catch (error: any) {
    console.error('[AI] Test failed:', error.message);
    res.status(500).json({ 
      error: 'AI test failed',
      details: error.message,
      code: error.code
    });
  }
});

// Analyze meeting transcript in real-time
router.post('/analyze', authenticateToken, async (req, res) => {
  console.log('[AI] /analyze endpoint called');
  
  try {
    // Check if OpenAI is configured
    if (!openai) {
      console.error('[AI] OpenAI client not initialized - missing API key');
      return res.status(503).json({ 
        error: 'AI service not configured',
        details: 'OpenAI API key is missing. Please configure OPENAI_API_KEY environment variable.'
      });
    }

    const { transcript, meetingContext, previousAnalysis } = req.body as AnalysisRequest;
    console.log('[AI] Request received:', { 
      transcriptLength: transcript?.length || 0, 
      hasContext: !!meetingContext,
      title: meetingContext?.title 
    });

    if (!transcript || transcript.length === 0) {
      return res.status(400).json({ error: 'No transcript provided' });
    }

    const recentTranscript = transcript.slice(-20).join('\n');
    const goalsText = meetingContext.goals?.join(', ') || 'No specific goals';
    const participantsText = meetingContext.participants?.map(p => `${p.name} (${p.role} at ${p.company})`).join(', ') || 'Unknown';
    
    // Build enhanced context
    let enhancedContext = '';
    if (meetingContext.myProfile) {
      enhancedContext += `\nMy Profile: ${meetingContext.myProfile.name} - ${meetingContext.myProfile.role} at ${meetingContext.myProfile.company}`;
      if (meetingContext.myProfile.background) {
        enhancedContext += `. Background: ${meetingContext.myProfile.background}`;
      }
    }
    if (meetingContext.selectedTeam) {
      enhancedContext += `\nMy Team: ${meetingContext.selectedTeam.name}`;
      if (meetingContext.selectedTeam.members?.length > 0) {
        enhancedContext += ` (${meetingContext.selectedTeam.members.map(m => m.name).join(', ')})`;
      }
    }

    const systemPrompt = `You are an expert meeting analyst and strategic advisor providing REAL-TIME analysis during a live meeting. Your job is to help the user succeed in their meeting goals.

Meeting Context:
- Title: ${meetingContext.title}
- Subject: ${meetingContext.subject || 'General discussion'}
- Goals: ${goalsText}
- Other Side Participants: ${participantsText}
- Concerns to watch: ${meetingContext.concerns || 'None specified'}${enhancedContext}

IMPORTANT: Provide actionable, specific insights. Analyze both what is being said AND what might be left unsaid. Detect potential lies or evasions.

Respond in the following JSON format ONLY (no other text):
{
  "suggestions": ["3 specific actionable suggestions - be tactical and direct"],
  "goalProgress": [
    {"goal": "goal text", "progress": "Not Started|In Progress|Almost|Achieved", "tips": "specific tactical tip"}
  ],
  "otherSideAnalysis": {
    "mood": "single word mood (e.g., Defensive, Open, Hesitant, Eager)",
    "moodScore": 0-100,
    "tone": "brief description of their communication tone",
    "engagement": "Low|Medium|High with brief explanation",
    "concerns": ["specific concerns you detect from their words"]
  },
  "lieDetector": {
    "confidence": 0-100,
    "indicators": ["specific behavioral or linguistic indicators"],
    "status": "truthful|uncertain|suspicious"
  },
  "keyInsights": ["3-5 specific observations about negotiation dynamics, power balance, hidden agendas"],
  "nextMoves": ["3 specific recommended actions - be tactical and strategic"]
}`;

    console.log('[AI] Calling OpenAI API...');
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Recent conversation transcript:\n${recentTranscript}\n\nProvide real-time tactical analysis.` }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    console.log('[AI] OpenAI response received');
    const content = response.choices[0]?.message?.content || '';
    
    // Try to parse JSON from response
    let analysis;
    try {
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(jsonStr);
      console.log('[AI] Analysis parsed successfully');
    } catch (parseError) {
      console.warn('[AI] JSON parse failed, using default structure');
      // If parsing fails, return a structured default with the raw content
      analysis = {
        suggestions: ['Continue the current discussion', 'Stay focused on the main objectives', 'Build rapport with participants'],
        goalProgress: meetingContext.goals?.map(g => ({ goal: g, progress: 'In Progress', tips: 'Keep working toward this goal' })) || [],
        otherSideAnalysis: {
          mood: 'Neutral',
          moodScore: 50,
          tone: 'Professional',
          engagement: 'Moderate',
          concerns: []
        },
        lieDetector: {
          confidence: 70,
          indicators: ['Analyzing speech patterns...'],
          status: 'truthful'
        },
        keyInsights: ['Meeting is progressing', 'More data needed for detailed analysis'],
        nextMoves: ['Continue conversation', 'Address any questions', 'Move toward objectives'],
        rawResponse: content
      };
    }

    res.json(analysis);
  } catch (error: any) {
    console.error('[AI] Analysis error:', error.message);
    console.error('[AI] Full error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze transcript',
      details: error.message 
    });
  }
});

// Quick sentiment analysis for a single utterance
router.post('/sentiment', authenticateToken, async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: 'AI service not configured' });
    }

    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { 
          role: 'system', 
          content: 'Analyze the sentiment and authenticity of the following text. Return JSON only: {"sentiment": "positive|negative|neutral", "confidence": 0-100, "authenticity": "truthful|uncertain|suspicious", "emotion": "primary emotion detected"}' 
        },
        { role: 'user', content: text }
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(jsonStr);

    res.json(result);
  } catch (error: any) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
});

// Generate strategic response suggestions
router.post('/suggest-response', authenticateToken, async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: 'AI service not configured' });
    }

    const { lastStatement, meetingGoals, context } = req.body;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { 
          role: 'system', 
          content: `You are a negotiation and communication expert. Given the last statement from the other party, suggest 3 strategic responses that help achieve the meeting goals: ${meetingGoals?.join(', ') || 'successful outcome'}. Return JSON only: {"responses": [{"text": "suggested response", "strategy": "why this works", "tone": "recommended tone"}]}` 
        },
        { role: 'user', content: `Last statement: "${lastStatement}"\nContext: ${context || 'Business meeting'}` }
      ],
      temperature: 0.8,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(jsonStr);

    res.json(result);
  } catch (error: any) {
    console.error('Response suggestion error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

export default router;
