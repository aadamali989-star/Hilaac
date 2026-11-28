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
    const body = (req.body ?? {}) as { front?: unknown; back?: unknown; subject?: unknown };
    if (typeof body?.front !== 'string' || !body.front.trim()) {
      res.status(400).json({ error: 'Flashcard prompt is required.' });
      return;
    }

    const front = body.front.trim().slice(0, 300);
    const back = typeof body.back === 'string' ? body.back.trim().slice(0, 500) : '';
    const subject =
      typeof body.subject === 'string' ? body.subject.trim().slice(0, 80) : 'Medical Sciences';

    const ai = getGeminiClient();
    const modelsToTry = [process.env.GEMINI_MODEL || 'gemini-flash-latest', 'gemini-4-hydrogen'];
    let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
    let lastModelError: unknown = null;

    for (const model of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: `Subject: ${subject}\nCard front: ${front}\nCard answer: ${back}\nProvide a short 1-2 sentence memorable clinical mnemonic or memory hook without repeating the full answer verbatim.`,
          config: {
            systemInstruction:
              'You provide concise medical memory hooks and active recall hints under 60 words.',
          },
        });
        break;
      } catch (err) {
        lastModelError = err;
      }
    }

    if (!response) {
      throw lastModelError instanceof Error
        ? lastModelError
        : new Error('Unable to reach Gemini model.');
    }

    res.status(200).json({
      hint: response.text?.trim() || 'Focus on the primary receptor or pathway involved.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to generate flashcard hint.';
    res.status(500).json({ error: msg });
  }
}
