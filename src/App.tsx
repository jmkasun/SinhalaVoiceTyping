import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Copy, 
  Check, 
  RotateCcw, 
  Save, 
  Download, 
  Sparkles, 
  Languages, 
  BookOpen, 
  TrendingUp, 
  ArrowRight, 
  Trash2, 
  HelpCircle, 
  X, 
  AlertTriangle,
  Info 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VoiceNote, DictationState } from './types';
import AudioVisualizer from './components/AudioVisualizer';
import PhoneticKeyboard from './components/PhoneticKeyboard';
import HistoryList from './components/HistoryList';

export default function App() {
  const [mainText, setMainText] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [micState, setMicState] = useState<DictationState>('idle');
  const [durationSec, setDurationSec] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-stop and copy setting
  const [autoStopAndCopy, setAutoStopAndCopy] = useState<boolean>(true);
  const latestTextRef = useRef<string>('');
  const silenceTimeoutRef = useRef<any>(null);

  useEffect(() => {
    latestTextRef.current = mainText;
  }, [mainText]);

  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  // Storage states
  const [savedNotes, setSavedNotes] = useState<VoiceNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNoteTitle, setActiveNoteTitle] = useState<string>('');

  // UI tabs & states
  const [activeRightPanel, setActiveRightPanel] = useState<'keyboard' | 'history'>('keyboard');
  const [copyStatus, setCopyStatus] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // AI assistant states
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiTaskMode, setAiTaskMode] = useState<'punctuation' | 'formalize' | 'translate' | null>(null);
  const [aiResultText, setAiResultText] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);

  // Web Audio analyser stream
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // References
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 1. Initialize & Check SpeechRecognition Web support
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const isSpeechSupported = !!SpeechRecognition;

  useEffect(() => {
    // Lead saved history from localStorage
    const stored = localStorage.getItem('sinhala_voice_notes');
    if (stored) {
      try {
        setSavedNotes(JSON.parse(stored));
      } catch (err) {
        console.error('Failed to parse saved notes:', err);
      }
    }
  }, []);

  // Sync saved notes back to localStorage
  const saveNotesToDisk = (updatedNotes: VoiceNote[]) => {
    setSavedNotes(updatedNotes);
    localStorage.setItem('sinhala_voice_notes', JSON.stringify(updatedNotes));
  };

  // Timer counter for recording duration
  useEffect(() => {
    let timer: any = null;
    if (isListening) {
      timer = setInterval(() => {
        setDurationSec(prev => prev + 1);
      }, 1000);
    } else {
      setDurationSec(0);
    }
    return () => clearInterval(timer);
  }, [isListening]);

  // Audio stream and recognition control
  const startListening = async () => {
    if (!isSpeechSupported) return;
    setErrorMessage(null);
    setInterimText('');

    try {
      // 1. Warm up audio context and state mic stream for analyzer drawing
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
      if (stream) {
        setMediaStream(stream);
      }

      // 2. Initialize recognition
      const rec = new SpeechRecognition();
      rec.lang = 'si-LK'; // Default standard Sinhala language parameter
      rec.continuous = true; // Run continuously so browser doesn't cut off immediately
      rec.interimResults = true;

      rec.onstart = () => {
        setIsListening(true);
        setMicState('listening');
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
      };

      rec.onresult = (event: any) => {
        // Clear previous silence timeout tracker as user is speaking
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }

        let finalBatch = '';
        let interimBatch = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalBatch += result[0].transcript;
          } else {
            interimBatch += result[0].transcript;
          }
        }

        if (finalBatch) {
          setMainText(prev => {
            const separator = prev && !prev.endsWith(' ') ? ' ' : '';
            const nextText = prev + separator + finalBatch;
            latestTextRef.current = nextText; // Sync immediately
            return nextText;
          });
          setInterimText('');
        } else {
          setInterimText(interimBatch);
        }

        // Auto Stop & Copy: Stop mic exactly 2 seconds AFTER voice stops completely
        if (autoStopAndCopy && (latestTextRef.current.trim() || interimBatch.trim())) {
          silenceTimeoutRef.current = setTimeout(() => {
            stopListening();
          }, 2000);
        }
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error event:', e);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        if (e.error === 'not-allowed') {
          setErrorMessage('මයික්‍රෆෝනය භාවිතයට අවසර දී නැත. කරුණාකර බ්‍රවුසර සැකසුම් පරීක්ෂා කරන්න. (Microphone access blocked. Please unlock browser mic permissions.)');
        } else if (e.error === 'no-speech') {
          // Normal timeout if nothing spoken, non-blocking
        } else {
          setErrorMessage(`දෝෂයක් සිදු විය: ${e.error || 'Unknown transcript failure'}`);
        }
        setMicState('error');
        stopListening();
      };

      rec.onend = () => {
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        setIsListening(false);
        setMicState(prev => prev === 'error' ? 'error' : 'idle');
        
        // Clean stream
        if (mediaStream) {
          mediaStream.getTracks().forEach(t => t.stop());
          setMediaStream(null);
        }

        // Auto copy if option is active & text isn't empty
        if (autoStopAndCopy && latestTextRef.current.trim()) {
          navigator.clipboard.writeText(latestTextRef.current.trim())
            .then(() => {
              setCopyStatus(true);
              setTimeout(() => setCopyStatus(false), 2500);
            })
            .catch(err => console.warn('Auto-clipboard copy blocked or failed:', err));
        }
      };

      recognitionRef.current = rec;
      rec.start();

    } catch (err: any) {
      console.error('Failed to initialize microphone dictation:', err);
      setErrorMessage('මයික්‍රෆෝනය සක්‍රීය කිරීමට නොහැකි විය. (Failed to capture input audio device.)');
      setMicState('error');
    }
  };

  const stopListening = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Recognition already closed:', err);
      }
    }
    setIsListening(false);
    if (micState !== 'error') {
      setMicState('idle');
    }

    // Stop microphone stream tracks properly so red light disappears.
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Insert text programmatically at cursor
  const handleInsertTextAtCursor = (insertedText: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMainText(prev => prev + insertedText);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const beforeText = mainText.substring(0, start);
    const afterText = mainText.substring(end, mainText.length);

    const merged = beforeText + insertedText + afterText;
    setMainText(merged);

    // Reposition cursor right after inserted text
    setTimeout(() => {
      textarea.focus();
      const nextPos = start + insertedText.length;
      textarea.setSelectionRange(nextPos, nextPos);
    }, 50);
  };

  // Text state counters
  const charCount = mainText.length;
  const wordCount = mainText.trim() ? mainText.trim().split(/\s+/).length : 0;
  const readTimeEst = Math.ceil(wordCount / 120); // Average 120 words-per-minute for speech

  // Actions
  const handleCopyText = () => {
    if (!mainText) return;
    navigator.clipboard.writeText(mainText);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const handleClearText = () => {
    setMainText('');
    setInterimText('');
    setActiveNoteId(null);
    setActiveNoteTitle('');
    latestTextRef.current = '';
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Saved Notes Actions
  const handleSaveNote = () => {
    if (!mainText.trim()) return;

    // Use prompt to input a clean title or use a slice of the text
    const defaultTitle = activeNoteTitle || `Sinhala Note - ${new Date().toLocaleDateString()}`;
    const draftTitle = window.prompt('මෙම සටහන සඳහා මාතෘකාවක් ඇතුළත් කරන්න (Enter a title for this note):', defaultTitle);
    
    if (draftTitle === null) return; // cancelled
    const finalTitle = draftTitle.trim() || defaultTitle;

    let updatedList: VoiceNote[] = [];

    if (activeNoteId) {
      // Edit existing note
      updatedList = savedNotes.map(n => n.id === activeNoteId ? {
        ...n,
        title: finalTitle,
        text: mainText,
        createdAt: new Date().toISOString()
      } : n);
    } else {
      // Create new note
      const newNote: VoiceNote = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        title: finalTitle,
        text: mainText,
        createdAt: new Date().toISOString(),
        durationMs: durationSec * 1000
      };
      updatedList = [newNote, ...savedNotes];
      setActiveNoteId(newNote.id);
    }

    setActiveNoteTitle(finalTitle);
    saveNotesToDisk(updatedList);
    alert('සටහන සාර්ථකව සුරැකිණි! (Note successfully compiled and saved!)');
  };

  const handleSelectNoteFromHistory = (note: VoiceNote) => {
    if (mainText && note.text !== mainText) {
      if (!window.confirm('සංස්කරණය කරමින් පවතින සටහන වෙනුවට තෝරාගත් සටහන පූරණය කරන්නද? (Switch note and discard unsaved edits?)')) {
        return;
      }
    }
    setMainText(note.text);
    setInterimText('');
    setActiveNoteId(note.id);
    setActiveNoteTitle(note.title);
  };

  const handleDeleteNoteFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('මෙම සටහන සම්පූර්ණයෙන්ම ඉවත් කිරීමට අවශ්‍යද? (Are you sure you want to delete this saved note?)')) {
      return;
    }

    const filtered = savedNotes.filter(n => n.id !== id);
    saveNotesToDisk(filtered);

    if (activeNoteId === id) {
      setActiveNoteId(null);
      setActiveNoteTitle('');
      setMainText('');
    }
  };

  const handleClearAllHistory = () => {
    if (window.confirm('සියලුම සුරකින ලද සටහන් ඉතිහාසය සම්පූර්ණයෙන්ම මකා දැමීමට අවශ්‍යද? මෙම ක්‍රියාව ආපසු හැරවිය නොහැක. (Destroy all note logs permanently? This is irreversible.)')) {
      saveNotesToDisk([]);
      setActiveNoteId(null);
      setActiveNoteTitle('');
      setMainText('');
    }
  };

  const handleDownloadTxt = () => {
    if (!mainText) return;
    const element = document.createElement("a");
    const file = new Blob([mainText], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    const originalName = activeNoteTitle ? activeNoteTitle.replace(/\s+/g, '_') : 'sinhala_voice_note';
    element.download = `${originalName}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // AI Refinement Proxy Functions (Calls /api/gemini/refine & /api/gemini/translate server endpoints)
  const triggerAiRefine = async (mode: 'punctuation' | 'formalize' | 'translate') => {
    if (!mainText.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiTaskMode(mode);
    setAiResultText(null);
    setShowAiModal(true);

    const apiEndpoint = mode === 'translate' ? '/api/gemini/translate' : '/api/gemini/refine';

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: mainText,
          mode: mode // Passed inside refine
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Server error occured during processing');
      }

      setAiResultText(data.result);
    } catch (err: any) {
      console.error('AI refinement endpoint error:', err);
      setAiError(err?.message || 'දුරස්ථ සේවාදායකය සමඟ සම්බන්ධ විය නොහැක (Failed to get response from processing endpoint. Check API key.)');
    } finally {
      setAiLoading(false);
    }
  };

  // Replace active draft with AI refined text
  const applyAiTextToEditor = () => {
    if (aiResultText) {
      setMainText(aiResultText);
      setShowAiModal(false);
      setAiResultText(null);
      alert('AI යෝජනා පෙළ සාර්ථකව ප්‍රතිස්ථාපනය විය! (Draft updated with polished text!)');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-250 flex flex-col">
      {/* 1. Brand Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-900 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-rose-500/10">
              <Mic className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-slate-800 dark:text-slate-100 text-base tracking-tight">
                  සිංහල හඬ ටයිප් කිරීම්
                </h1>
                <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  Voice Typist Pro
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="btn-help-modal"
              onClick={() => setShowHelp(true)}
              className="p-2 border border-slate-100 dark:border-indigo-950 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
              title="View Guidelines & Help"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex flex-col text-right font-mono text-[10px] text-slate-400">
              <span>Time: 2026-06-20</span>
              <span>UTC Studio Sync</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column (Main Dictation Core) */}
        <section className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-3xl p-5 shadow-sm space-y-4">
            
            {/* 1. Indicator strip & Visualizer */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  isListening 
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100/50' 
                    : micState === 'error'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  <span className={`h-2 h-2 w-2 rounded-full ${isListening ? 'bg-rose-500 animate-ping' : 'bg-slate-400'}`} />
                  {isListening ? `Live Recording (${formatTimer(durationSec)})` : 'Ready to listen'}
                </span>

                {activeNoteTitle && (
                  <span className="text-xs font-semibold max-w-[160px] truncate text-slate-400 flex items-center gap-1">
                    / {activeNoteTitle}
                  </span>
                )}
              </div>

              {/* Auto stop and Copy setting element */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1 rounded-lg border border-slate-100/60 dark:border-slate-800/40 text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                <input 
                  type="checkbox"
                  id="auto-stop-copy-toggle"
                  checked={autoStopAndCopy}
                  onChange={(e) => setAutoStopAndCopy(e.target.checked)}
                  className="w-3 h-3 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                />
                <label htmlFor="auto-stop-copy-toggle" className="cursor-pointer select-none flex items-center gap-1">
                  Auto Stop & Copy
                </label>
              </div>
            </div>

            {/* Top Command Toolbar (Control Deck rearranged to top) */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 bg-slate-50 dark:bg-slate-900/60 p-1.5 md:p-2 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <div className="flex flex-wrap items-center gap-1.5 w-full">
                <button
                  id="btn-trigger-voice-dictation"
                  onClick={toggleListening}
                  className={`px-3 py-1.5 rounded-lg font-bold shadow-sm transition-all flex items-center gap-1.5 text-[11px] md:text-xs cursor-pointer ${
                    isListening
                      ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-750 text-white shadow-rose-500/20 hover:scale-[1.01] active:scale-99'
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-600 hover:to-indigo-750 text-white shadow-indigo-600/20 hover:scale-[1.01] active:scale-99'
                  }`}
                  disabled={!isSpeechSupported}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 animate-pulse shrink-0" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 shrink-0" />
                      <span>Dictate</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-action-copy"
                  onClick={handleCopyText}
                  disabled={charCount === 0}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-[11px] md:text-xs font-semibold shadow-sm"
                  title="Copy text to clipboard"
                >
                  {copyStatus ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                  <span>{copyStatus ? 'Copied!' : 'Copy'}</span>
                </button>

                <button
                  id="btn-action-clear"
                  onClick={handleClearText}
                  disabled={charCount === 0}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-[11px] md:text-xs font-semibold shadow-sm"
                  title="Clear document draft"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* 2. Text Editor Draft canvas */}
            <div className="relative">
              {!isSpeechSupported && (
                <div className="absolute inset-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-red-200/50 rounded-2xl">
                  <AlertTriangle className="w-11 h-11 text-amber-500 mb-3" />
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    Speech recognition not supported in this browser
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1.5">
                    We suggest accessing via <strong className="text-indigo-600 font-semibold">Google Chrome</strong> for fully-integrated real-time Sinhala speech synthesis. You can still type beautifully using our phonetic Singlish tool below!
                  </p>
                </div>
              )}

              {/* Warnings and alerts */}
              {errorMessage && (
                <div className="mb-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/60 p-3 rounded-xl flex gap-2 text-xs text-rose-700 dark:text-rose-300">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{errorMessage}</p>
                </div>
              )}

              <div id="main-editor-container" className="relative border border-slate-100 dark:border-slate-800 rounded-2xl focus-within:ring-2 focus-within:ring-rose-500/20 transition-all">
                <textarea
                  id="main-editor-textarea"
                  ref={textareaRef}
                  value={mainText}
                  onChange={(e) => setMainText(e.target.value)}
                  placeholder="මෙහි කථා කරන්න, නැතහොත් පහත සහායක යතුරුපුවරුව භාවිතයෙන් ටයිප් කරන්න... (Speak now or use the Singlish phonetic writer below to insert text...)"
                  className="w-full h-44 px-4 py-4 pr-1 text-slate-700 dark:text-slate-100 placeholder-slate-400 bg-slate-50/30 font-sans text-base leading-relaxed focus:outline-none resize-none rounded-2xl"
                />

                {interimText && (
                  <div 
                    id="live-interim-preview"
                    className="absolute bottom-4 left-4 right-4 bg-rose-500/5 dark:bg-rose-450/10 border-l-2 border-rose-500 pl-3 py-1.5 text-slate-500 dark:text-rose-300 rounded-r-lg text-sm italic inline-flex items-center gap-2"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    {interimText}...
                  </div>
                )}
              </div>
            </div>

            {/* Audio wave dynamic visualization */}
            <AudioVisualizer isActive={isListening} stream={mediaStream} />

            {/* 3. Spoken stats info bar & fast utilities */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500 font-mono">
                <div>
                  Words: <span className="text-slate-700 dark:text-slate-300 font-bold">{wordCount}</span>
                </div>
                <div>
                  Chars: <span className="text-slate-700 dark:text-slate-300 font-bold">{charCount}</span>
                </div>
                <div>
                  Speak duration: <span className="text-slate-700 dark:text-slate-300 font-bold">{readTimeEst} min</span>
                </div>
              </div>

              <div id="quick-punctuation-tray" className="flex items-center gap-1.5">
                <button
                  id="btn-fast-space"
                  onClick={() => handleInsertTextAtCursor(' ')}
                  className="bg-white dark:bg-slate-800 select-none border border-slate-200 dark:border-slate-700 hover:bg-slate-100 hover:text-slate-950 text-[11px] px-2.5 py-1 rounded-lg text-slate-500 transition-colors cursor-pointer active:scale-95 font-medium"
                >
                  ␣ Space
                </button>
                <button
                  id="btn-fast-period"
                  onClick={() => handleInsertTextAtCursor('.')}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 hover:text-slate-950 font-bold text-[11px] px-2.5 py-1 rounded-lg text-slate-500 transition-colors cursor-pointer active:scale-95"
                >
                  . Full stop
                </button>
                <button
                  id="btn-fast-comma"
                  onClick={() => handleInsertTextAtCursor(',')}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 hover:text-slate-950 font-bold text-[11px] px-2.5 py-1 rounded-lg text-slate-500 transition-colors cursor-pointer active:scale-95"
                >
                  , Comma
                </button>
                <button
                  id="btn-fast-newline"
                  onClick={() => handleInsertTextAtCursor('\n')}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 hover:text-slate-950 font-medium text-[11px] px-2.5 py-1 rounded-lg text-slate-500 transition-colors cursor-pointer active:scale-95"
                >
                  ↵ New line
                </button>
              </div>
            </div>



            {/* Smart AI Post-processing Tools */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                AI-Powered Sri Lankan Copywriter & Refiner
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  id="btn-ai-punctuation"
                  onClick={() => triggerAiRefine('punctuation')}
                  disabled={charCount === 0 || aiLoading}
                  className="flex flex-col items-start p-3 bg-gradient-to-br from-indigo-50/40 to-slate-50 hover:from-indigo-50/70 hover:to-slate-100 dark:from-indigo-950/10 dark:to-slate-900 border border-indigo-100/40 dark:border-indigo-900/45 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-99 disabled:opacity-50 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    Punctuation Suggest
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                    Insert accurate full stops, logic commas, and breaks.
                  </span>
                </button>

                <button
                  id="btn-ai-formalize"
                  onClick={() => triggerAiRefine('formalize')}
                  disabled={charCount === 0 || aiLoading}
                  className="flex flex-col items-start p-3 bg-gradient-to-br from-rose-50/40 to-slate-50 hover:from-rose-50/70 hover:to-slate-100 dark:from-rose-950/10 dark:to-slate-900 border border-rose-100/40 dark:border-rose-900/45 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-99 disabled:opacity-50 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-pink-700 dark:text-pink-400">
                    <Languages className="w-3.5 h-3.5" />
                    Formal Written (ලේඛන)
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                    Refine colloquial dictations to formal written Sinhala structures.
                  </span>
                </button>

                <button
                  id="btn-ai-translate"
                  onClick={() => triggerAiRefine('translate')}
                  disabled={charCount === 0 || aiLoading}
                  className="flex flex-col items-start p-3 bg-gradient-to-br from-purple-50/40 to-slate-50 hover:from-purple-50/70 hover:to-slate-100 dark:from-purple-950/10 dark:to-slate-900 border border-purple-100/40 dark:border-purple-900/45 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-99 disabled:opacity-50 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400">
                    <Languages className="w-3.5 h-3.5" />
                    Sinhala to English (AI)
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                    Translate spoken Sinhala instantly to clean natural English.
                  </span>
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* Right Column (Side helpers - Phonetic writing helper & Saved Notes Archive) */}
        <section className="lg:col-span-5 space-y-4">
          
          {/* Section Panel Selector Tabs */}
          <div className="flex bg-slate-200/60 dark:bg-slate-900 rounded-2xl p-1 gap-1">
            <button
              id="switch-subpanel-keyboard"
              onClick={() => setActiveRightPanel('keyboard')}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeRightPanel === 'keyboard'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Languages className="w-4 h-4" />
              Assisted Keyboard
            </button>
            <button
              id="switch-subpanel-history"
              onClick={() => setActiveRightPanel('history')}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeRightPanel === 'history'
                  ? 'bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <Save className="w-4 h-4" />
              History Notes ({savedNotes.length})
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeRightPanel}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeRightPanel === 'keyboard' ? (
                <PhoneticKeyboard onInsertText={handleInsertTextAtCursor} />
              ) : (
                <HistoryList
                  notes={savedNotes}
                  activeNoteId={activeNoteId}
                  onSelectNote={handleSelectNoteFromHistory}
                  onDeleteNote={handleDeleteNoteFromHistory}
                  onClearAll={handleClearAllHistory}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Quick Tip info panel */}
          <div className="bg-slate-100/50 dark:bg-slate-900/20 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex gap-3 text-xs text-slate-500 dark:text-slate-400">
            <Info className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <p className="font-semibold text-slate-600 dark:text-slate-350">Speech Accuracy Advice</p>
              <p className="mt-0.5 leading-relaxed">
                For best results speak close to your microphone at a moderate pace, clearly enunciating Sinhala vowels. Speech-to-text filters out heavy accent drifts and ambient chatter. Keep the tab active during recordings!
              </p>
            </div>
          </div>

        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 mt-auto py-5 text-center px-4">
        <p className="text-xs text-slate-400">
          © 2026 Sinhala Voice Typist. Empowered with secure server-side Google Gemini Models.
        </p>
      </footer>

      {/* MODAL 1: AI Result Presentation */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 w-full max-w-2xl rounded-3xl p-6 shadow-xl space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-105 text-sm">
                      {aiTaskMode === 'punctuation' 
                        ? 'AI Punctuation & Spacing Suggestion' 
                        : aiTaskMode === 'formalize' 
                        ? 'AI Grammar Formalizer (ලේඛන ව්‍යවහාරය)' 
                        : 'Sinhala to English Translation'}
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Processing with Gemini 3.5 Flash Model
                    </p>
                  </div>
                </div>
                <button
                  id="btn-close-ai-modal"
                  onClick={() => setShowAiModal(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Loader */}
              {aiLoading && (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500/25 border-t-indigo-600 animate-spin" />
                  <p className="text-xs text-slate-500 animate-pulse font-medium">
                    විසඳුම් සලකා බලමින් පවතී... (Asking Gemini to refine and polish your draft...)
                  </p>
                </div>
              )}

              {/* Error */}
              {aiError && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/60 p-4 rounded-2xl text-xs text-rose-750 dark:text-rose-300 flex gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-bold mb-0.5">Refinement Process Blocked</p>
                    <p>{aiError}</p>
                  </div>
                </div>
              )}

              {/* Result Preview comparison */}
              {aiResultText !== null && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Original Transcript</span>
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 h-48 rounded-xl text-xs text-slate-500 overflow-y-auto leading-relaxed border border-slate-100 dark:border-slate-900">
                        {mainText}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-indigo-500">AI Gemini Refined Vorschlag</span>
                      <div className="bg-indigo-50/20 dark:bg-indigo-950/20 p-3 h-48 rounded-xl text-xs text-slate-800 dark:text-indigo-200 overflow-y-auto leading-relaxed border border-indigo-150/40 font-medium">
                        {aiResultText}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      id="btn-ai-result-copy"
                      onClick={() => {
                        navigator.clipboard.writeText(aiResultText);
                        alert('Copied suggestion to clipboard!');
                      }}
                      className="px-3.5 py-2 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer border border-slate-200"
                    >
                      Copy to clipboard
                    </button>
                    <button
                      id="btn-apply-ai-to-editor"
                      onClick={applyAiTextToEditor}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-98"
                    >
                      Apply / Replace Main Draft
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: HELP GUIDELINE OVERLAY */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 w-full max-w-xl rounded-3xl p-6 shadow-xl space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    Sinhala Voice Typist User Manual
                  </h3>
                </div>
                <button
                  id="btn-close-help-modal"
                  onClick={() => setShowHelp(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs text-slate-600 dark:text-slate-350 leading-relaxed max-h-[380px] overflow-y-auto pr-1">
                <div>
                  <h4 className="font-bold text-slate-705 dark:text-slate-200 flex items-center gap-1">
                    <span className="w-5 h-5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold rounded-full flex items-center justify-center text-[11px]">1</span>
                    හඬ මඟින් සිංහල ටයිප් කිරීම (Sinhala Voice Typing)
                  </h4>
                  <p className="mt-1 pl-6">
                    <strong>Start Sinhala Dictation</strong> බොත්තම ක්ලික් කර බ්‍රවුසරයට මයික්‍රෆෝන අවසර ලබා දෙන්න. ඉන්පසු පැහැදිලි සිංහල වචන වලින් කථා කරන්න. ඔබ පවසන දෙය සජීවීව පෙළ බවට පරිවර්තනය වී ප්‍රධාන කොටුවෙහි දිස්වනු ඇත.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-705 dark:text-slate-200 flex items-center gap-1">
                    <span className="w-5 h-5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold rounded-full flex items-center justify-center text-[11px]">2</span>
                    සහායක යතුරුපුවරුව (Singlish & Direct Keyboard Assistant)
                  </h4>
                  <p className="mt-1 pl-6">
                    කථනයේදී සිදුවන සුළු වැරදි හෝ අඩුවැඩියා පහසුවෙන් නිවැරදි කරගැනීමට දකුණු පස ඇති සහායක පුවරුව භාවිතා කරන්න:
                  </p>
                  <ul className="list-disc pl-11 mt-1 space-y-0.5">
                    <li><strong>Singlish Writer:</strong> ඔබට හුරුපුරුදු ඉංග්‍රීසි අකුරින් ටයිප් කරන දේ (e.g., &quot;subha dhavasak&quot;) මෙහිදී සජීවීව සිංහල යුනිකෝඩ් බවට පෙරලේ.</li>
                    <li><strong>Vowels / Consonants / Modifiers:</strong> යතුරුපුවරුවක් නැතත් අකුරු මත ක්ලික් කිරීමෙන් පෙළ පහසුවෙන් සකසා ගත හැක.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-slate-705 dark:text-slate-200 flex items-center gap-1">
                    <span className="w-5 h-5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold rounded-full flex items-center justify-center text-[11px]">3</span>
                    කෘතිම බුද්ධි සහාය (AI Co-Pilot Processing)
                  </h4>
                  <p className="mt-1 pl-6">
                    පෙළ කොටස ලියා අවසානයේ පහත ඇති AI මෙවලම් යොදන්න:
                  </p>
                  <ul className="list-disc pl-11 mt-1 space-y-0.5">
                    <li><strong>Punctuation Suggest:</strong> කථන පෙළට අවශ්‍ය තිත්, කොමා, සහ ඡේද නිවැරදිව තබයි.</li>
                    <li><strong>Formal Written:</strong> කටවහරේ වචන (ලියන විට නොගැලපෙන දේ) නිවැරදි ලේඛන ව්‍යවහාරයට පරිවර්තනය කරයි.</li>
                    <li><strong>Sinhala to English:</strong> සම්පූර්ණ කෙටුම්පත අර්ථය සුරකිමින් ඉංග්‍රීසි භාෂාවට පරිවර්තනය කරයි.</li>
                  </ul>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/30 p-3 rounded-xl border border-slate-100">
                  <p className="font-bold mb-1 flex items-center gap-1"><Info className="w-3.5 h-3.5 text-indigo-500" /> Browser Compatibility</p>
                  <p>
                    Voice input fits best on <strong>Google Chrome</strong> (desktop & mobile) using internal Google speech engines. Non-Chrome browsers (such as Firefox, Safari) may fall back to the phonetic helper writer.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-right">
                <button
                  id="btn-dismiss-help"
                  onClick={() => setShowHelp(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold rounded-xl cursor-pointer"
                >
                  Close Guide
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
