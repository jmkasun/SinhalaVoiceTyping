import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini SDK securely on the server
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json());

// API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Endpoint to refine and add Sinhala punctuation using Gemini
app.post('/api/gemini/refine', async (req: express.Request, res: express.Response) => {
  try {
    const { text, mode } = req.body;
    if (!text || text.trim() === '') {
      res.status(400).json({ error: 'Text is required for refinement' });
      return;
    }

    if (!apiKey) {
      res.status(500).json({ error: 'Gemini API key is not configured' });
      return;
    }

    let prompt = '';
    if (mode === 'punctuation') {
      prompt = `You are an expert Sinhala copy-editor. The user transcribed speech in Sinhala. It has NO punctuation. 
Your task is ONLY to add suitable punctuation (periods, commas, question marks, quotation marks, exclamation marks) and fix obvious sentence structures while keeping the exact wording and dialect intact. 
Ensure paragraphs are formed logically.
Do NOT translate to English.
Return ONLY the formatted Sinhala text, nothing else. No extra explanations, no headers, no intro or outro comments.

Speech transcription to refine:
"${text}"`;
    } else if (mode === 'formalize') {
      prompt = `You are a professional Sinhala proofreader. The user gave Sinhala draft notes. 
Convert the spoken colloquial Sinhala phrases (e.g., used in dictation) into formal, grammatically polished written Sinhala (ලේඛන ව්‍යවහාරය) where appropriate, or simply clean up any spelling mistakes, and structure it beautifully. 
Keep the tone natural, polite, and elegant.
Return ONLY the revised written Sinhala text, nothing else. No extra explanations or markdown blocks besides the pure content.

Text to formalize:
"${text}"`;
    } else {
      prompt = `Clean up the spelling, grammar, and add appropriate punctuation to the following Sinhala text. 
Return ONLY the polished Sinhala text. No extra text.

Text:
"${text}"`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const refinedText = response.text || text;
    res.json({ result: refinedText.trim() });
  } catch (error: any) {
    console.error('Gemini refinement failed:', error);
    res.status(500).json({ error: error?.message || 'Failed to refine Sinhala text' });
  }
});

// Endpoint to translate Sinhala text to fluent English
app.post('/api/gemini/translate', async (req: express.Request, res: express.Response) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === '') {
      res.status(400).json({ error: 'Text to translate is required' });
      return;
    }

    if (!apiKey) {
      res.status(500).json({ error: 'Gemini API key is not configured' });
      return;
    }

    const prompt = `You are a high-fidelity translator specializing in Sinhala to English translation. 
Translate the following Sinhala text into natural, fluent English. Keep the meaning accurate and matching the original tone.
Return ONLY the English translated text. No explanations, no introductory text, no note of translation.

Sinhala text to translate:
"${text}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const translatedText = response.text || '';
    res.json({ result: translatedText.trim() });
  } catch (error: any) {
    console.error('Gemini translation failed:', error);
    res.status(500).json({ error: error?.message || 'Failed to translate Sinhala text' });
  }
});

// Setup dev server or static build serving
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    // In development mode, integrate Vite as a middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production mode, serve compiled files from 'dist'
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer().catch(err => {
  console.error('Failed to start server:', err);
});
