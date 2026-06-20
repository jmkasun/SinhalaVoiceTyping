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
    res.status(200).json({ result: translatedText.trim() });
  } catch (error: any) {
    console.error('Gemini translation failed:', error);
    res.status(500).json({ error: error?.message || 'Failed to translate Sinhala text' });
  }
}
