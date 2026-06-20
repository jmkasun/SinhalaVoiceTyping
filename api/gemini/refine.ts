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
    res.status(200).json({ result: refinedText.trim() });
  } catch (error: any) {
    console.error('Gemini refinement failed:', error);
    res.status(500).json({ error: error?.message || 'Failed to refine Sinhala text' });
  }
}
