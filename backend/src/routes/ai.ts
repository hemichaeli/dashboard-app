import express from 'express';
import OpenAI from 'openai';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Model to use for AI analysis
const AI_MODEL = 'gpt-5-mini';

interface MeetingContext {
  title: string;
  goals: string[];
  participants: { name: string; role: string; company: string }[];
  teamMembers: { name: string; position: string }[];
  concerns: string;
}

interface AnalysisRequest {
  transcript: string[];
  meetingContext: MeetingContext;
  previousAnalysis?: any;
}

// Analyze meeting transcript in real-time
router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    const { transcript, meetingContext, previousAnalysis } = req.body as AnalysisRequest;

    if (!transcript || transcript.length === 0) {
      return res.status(400).json({ error: 'No transcript provided' });
    }

    const recentTranscript = transcript.slice(-20).join('\n');
    const goalsText = meetingContext.goals?.join(', ') || 'No specific goals';
    const participantsText = meetingContext.participants?.map(p => `${p.name} (${p.role} at ${p.company})`).join(', ') || 'Unknown';

    const systemPrompt = `You are an expert meeting analyst and strategic advisor. Your job is to analyze real-time meeting conversations and provide actionable insights.

Meeting Context:
- Title: ${meetingContext.title}
- Goals: ${goalsText}
- Participants: ${participantsText}
- Concerns to watch: ${meetingContext.concerns || 'None specified'}

Analyze the conversation and provide insights in the following JSON format ONLY (no other text):
{
  "suggestions": ["3 specific actionable suggestions to achieve meeting goals"],
  "goalProgress": [
    {"goal": "goal text", "progress": "Not Started|In Progress|Almost|Achieved", "tips": "specific tip"}
  ],
  "otherSideAnalysis": {
    "mood": "single word mood",
    "moodScore": 0-100,
    "tone": "brief description of tone",
    "engagement": "engagement level description",
    "concerns": ["detected concerns from their speech"]
  },
  "lieDetector": {
    "confidence": 0-100,
    "indicators": ["behavioral indicators observed"],
    "status": "truthful|uncertain|suspicious"
  },
  "keyInsights": ["3-5 key observations about the meeting dynamics"],
  "nextMoves": ["3 recommended next actions"]
}`;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Recent conversation transcript:\n${recentTranscript}\n\nProvide real-time analysis.` }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Try to parse JSON from response
    let analysis;
    try {
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
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
    console.error('AI Analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze transcript',
      details: error.message 
    });
  }
});

// Quick sentiment analysis for a single utterance
router.post('/sentiment', authenticateToken, async (req, res) => {
  try {
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
