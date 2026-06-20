export interface VoiceNote {
  id: string;
  title: string;
  text: string;
  createdAt: string;
  durationMs: number;
}

export type DictationState = 'idle' | 'listening' | 'paused' | 'error';
