import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { audio, mimeType } = req.body;
    if (!audio) {
      res.status(400).json({ error: 'Audio data is required' });
      return;
    }

    if (!apiKey) {
      res.status(500).json({ error: 'Gemini API key is not configured' });
      return;
    }

    const cleanBase64 = audio.includes('base64,') ? audio.split('base64,')[1] : audio;

    const prompt = `You are a high-quality Sinhala speech transcriber. 
Transcribe the provided audio precisely into written Sinhala text. 
Return ONLY the transcribed Sinhala text, with no notes, explanations, formatting, markdown tags, summaries, or metadata. Keep the language natural and spoken Sinhala words intact.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'audio/webm',
            data: cleanBase64,
          },
        },
        prompt
      ],
    });

    const text = response.text || '';
    res.status(200).json({ result: text.trim() });
  } catch (error: any) {
    console.error('Gemini audio transcription failed:', error);
    res.status(500).json({ error: error?.message || 'Failed to transcribe audio' });
  }
}
