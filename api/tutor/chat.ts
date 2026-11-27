import { GoogleGenAI } from '@google/genai';

interface ApiRequest {
  method?: string;
  body?: unknown;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (payload: unknown) => void;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in Vercel Environment Variables.');
  }
  return new GoogleGenAI({ apiKey });
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const body = (req.body ?? {}) as {
      message?: unknown;
      subject?: unknown;
      role?: unknown;
      history?: unknown;
    };

    if (typeof body?.message !== 'string' || !body.message.trim()) {
      res.status(400).json({ error: 'Please enter a valid study question.' });
      return;
    }

    const message = body.message.trim().slice(0, 4000);
    const subject =
      typeof body.subject === 'string' && body.subject.trim()
        ? body.subject.trim().slice(0, 80)
        : 'General Medical Sciences';
    const userRole =
      typeof body.role === 'string' && body.role.trim()
        ? body.role.trim().slice(0, 30)
        : 'student';

    const historyList = Array.isArray(body.history)
      ? body.history
          .filter(
            (item): item is { sender: string; text: string } =>
              Boolean(item) &&
              typeof (item as { sender?: unknown }).sender === 'string' &&
              typeof (item as { text?: unknown }).text === 'string'
          )
          .slice(-6)
      : [];

    const conversationContext = historyList
      .map((h) => `${h.sender === 'user' ? 'Learner' : 'Tutor'}: ${h.text.slice(0, 800)}`)
      .join('\n');

    const ai = getGeminiClient();
    const systemInstruction = [
      'You are an expert medical and academic study tutor for Hilaac Health Center.',
      `Current subject focus: ${subject}. Learner role: ${userRole}.`,
      'Reply in the same language as the learner (English or Somali) with warm clarity and precision.',
      'Format your answer cleanly using short ### section headings, concise bullet points, and **bold** for key drug names, receptors, organisms, or clinical thresholds.',
      'For homework or concept help, guide step-by-step reasoning and finish with a short ### Active Recall Check containing 1 practice question.',
      'Keep responses focused (under 300 words unless asked for deep detail) and briefly remind the learner that educational guidance supports study and does not replace licensed clinical supervision.',
    ].join(' ');

    const fullPrompt = conversationContext
      ? `Previous context:\n${conversationContext}\n\nCurrent question:\n${message}`
      : message;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: fullPrompt,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text?.trim();
    if (!reply) {
      res.status(502).json({ error: 'The AI tutor returned an empty response. Please try again.' });
      return;
    }

    res.status(200).json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to reach AI tutor service.';
    res.status(500).json({ error: msg });
  }
}
