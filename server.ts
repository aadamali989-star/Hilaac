import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'hilaac-health-study-suite' });
  });

  app.post('/api/tutor/chat', async (req, res) => {
    try {
      const body = req.body as {
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
        `You are an expert medical and academic study tutor for Hilaac Health Center.`,
        `Current subject focus: ${subject}. Learner role: ${userRole}.`,
        `Reply in the same language as the learner (English or Somali) with warm clarity and precision.`,
        `Format your answer cleanly using short ### section headings, concise bullet points, and **bold** for key drug names, receptors, organisms, or clinical thresholds.`,
        `For homework or concept help, guide step-by-step reasoning and finish with a short ### Active Recall Check containing 1 practice question.`,
        `Keep responses focused (under 300 words unless asked for deep detail) and briefly remind the learner that educational guidance supports study and does not replace licensed clinical supervision.`,
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

      res.json({ reply });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reach AI tutor service.';
      console.error('AI Tutor error:', msg);
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/tutor/flashcard-hint', async (req, res) => {
    try {
      const body = req.body as { front?: unknown; back?: unknown; subject?: unknown };
      if (typeof body?.front !== 'string' || !body.front.trim()) {
        res.status(400).json({ error: 'Flashcard prompt is required.' });
        return;
      }
      const front = body.front.trim().slice(0, 300);
      const back = typeof body.back === 'string' ? body.back.trim().slice(0, 500) : '';
      const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 80) : 'Medical Sciences';

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Subject: ${subject}\nCard front: ${front}\nCard answer: ${back}\nProvide a short 1-2 sentence memorable clinical mnemonic or memory hook without repeating the full answer verbatim.`,
        config: {
          systemInstruction: 'You provide concise medical memory hooks and active recall hints under 60 words.',
        },
      });

      res.json({ hint: response.text?.trim() || 'Focus on the primary receptor or pathway involved.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to generate flashcard hint.';
      res.status(500).json({ error: msg });
    }
  });

  if (!isProduction) {
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript');
      res.setHeader('Cache-Control', 'no-store');
      res.send(`
const sheetsMap = new Map();
const linkSheetsMap = new Map();
if ("document" in globalThis) {
  document.querySelectorAll("style[data-vite-dev-id]").forEach((el) => {
    sheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    linkSheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
}
function updateStyle(id, content) {
  if (linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
}
function removeStyle(id) {
  if (linkSheetsMap.has(id)) {
    document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id="' + CSS.escape(id) + '"]').forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}
function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    decline() {},
    on() {},
    off() {},
    send() {},
  };
}
function injectQuery(url, queryToInject) {
  if (url[0] !== "." && url[0] !== "/") return url;
  const pathname = url.replace(/[?#].*$/, "");
  const { search, hash } = new URL(url, "http://vite.dev");
  return pathname + "?" + queryToInject + (search ? "&" + search.slice(1) : "") + (hash || "");
}
const BaseHTMLElement = typeof HTMLElement !== "undefined" ? HTMLElement : class {};
class ErrorOverlay extends BaseHTMLElement {}
export { ErrorOverlay, createHotContext, injectQuery, removeStyle, updateStyle };
`);
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
