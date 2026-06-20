import { useState, useEffect } from 'react';
import { 
  transliterateSinglishToSinhala, 
  SINHALA_VOWELS, 
  SINHALA_CONSONANTS, 
  SINHALA_MODIFIERS 
} from '../utils/sinhalaTransliteration';
import { Keyboard, Sparkles, BookOpen, AlertCircle } from 'lucide-react';

interface PhoneticKeyboardProps {
  onInsertText: (text: string) => void;
}

export default function PhoneticKeyboard({ onInsertText }: PhoneticKeyboardProps) {
  const [activeTab, setActiveTab] = useState<'singlish' | 'vowels' | 'consonants' | 'modifiers'>('singlish');
  const [singlishInput, setSinglishInput] = useState('');
  const [sinhalaOutput, setSinhalaOutput] = useState('');

  // Live transliteration
  useEffect(() => {
    setSinhalaOutput(transliterateSinglishToSinhala(singlishInput));
  }, [singlishInput]);

  const handleInsertSinglish = () => {
    if (sinhalaOutput) {
      onInsertText(sinhalaOutput);
      setSinglishInput('');
      setSinhalaOutput('');
    }
  };

  return (
    <div id="sinhala-keyboard-panel" className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 md:p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 gap-2.5">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs md:text-sm">
            Sinhala Typing Assistant & Keyboard Helper
          </h3>
        </div>
        <div className="flex flex-wrap bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 gap-0.5 text-[11px] self-start sm:self-auto">
          <button
            id="tab-singlish-keyboard"
            onClick={() => setActiveTab('singlish')}
            className={`px-2 py-1 rounded-md font-medium transition-all ${
              activeTab === 'singlish' 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
            }`}
          >
            Singlish Writer
          </button>
          <button
            id="tab-vowels-keyboard"
            onClick={() => setActiveTab('vowels')}
            className={`px-2 py-1 rounded-md font-medium transition-all ${
              activeTab === 'vowels' 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
            }`}
          >
            Vowels (ස්වර)
          </button>
          <button
            id="tab-consonants-keyboard"
            onClick={() => setActiveTab('consonants')}
            className={`px-2 py-1 rounded-md font-medium transition-all ${
              activeTab === 'consonants' 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
            }`}
          >
            Consonants (ව්‍යංජන)
          </button>
          <button
            id="tab-modifiers-keyboard"
            onClick={() => setActiveTab('modifiers')}
            className={`px-2 py-1 rounded-md font-medium transition-all ${
              activeTab === 'modifiers' 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
            }`}
          >
            Modifiers (පිලි)
          </button>
        </div>
      </div>

      {activeTab === 'singlish' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Type phonetic Singlish here (e.g., <span className="underline decoration-indigo-400/40">amma</span>, <span className="underline decoration-indigo-400/40">subha udhasanak</span>)
              </label>
              <input
                id="singlish-phonetic-input"
                type="text"
                value={singlishInput}
                onChange={(e) => setSinglishInput(e.target.value)}
                placeholder="Type word-by-word here..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInsertSinglish();
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all dark:text-slate-100"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                Sinhala preview <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              </label>
              <div 
                id="singlish-transliterated-output"
                className="w-full min-h-[38px] px-3 py-2 text-sm bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/30 dark:border-indigo-900/40 rounded-xl font-medium text-slate-800 dark:text-indigo-200 flex items-center justify-between"
              >
                <span>{sinhalaOutput || 'සජීවී පරිවර්තනය මෙහි දිස්වේ...'}</span>
                {sinhalaOutput && (
                  <button
                    id="btn-insert-transliterated-text"
                    onClick={handleInsertSinglish}
                    className="ml-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg transition-colors font-medium cursor-pointer"
                  >
                    Insert text
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 flex gap-2.5 text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-250">
            <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Quick Guide</p>
              <p>Type sound-alike words. Modifiers like <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">aa</code> adds aela pilla (ා). Try combinations: <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">ko</code> = කො, <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">mal</code> = මල්, <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">api</code> = අපි.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vowels' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Click character to insert at editor cursor:</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {SINHALA_VOWELS.map((item, idx) => (
              <button
                id={`btn-vowel-key-${idx}`}
                key={idx}
                type="button"
                onClick={() => onInsertText(item.char)}
                className="flex flex-col items-center justify-center p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl transition-all hover:scale-105 active:scale-95 text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <span className="text-lg font-bold">{item.char}</span>
                <span className="text-[10px] text-slate-400 font-mono italic">{item.sound}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'consonants' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Click character to insert at editor cursor:</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {SINHALA_CONSONANTS.map((item, idx) => (
              <button
                id={`btn-consonant-key-${idx}`}
                key={idx}
                type="button"
                onClick={() => onInsertText(item.char)}
                className="flex flex-col items-center justify-center p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl transition-all hover:scale-105 active:scale-95 text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <span className="text-lg font-bold">{item.char}</span>
                <span className="text-[10px] text-slate-400 font-mono italic">{item.sound}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'modifiers' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Click modifier to attach to the last letter in editor:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {SINHALA_MODIFIERS.map((item, idx) => (
              <button
                id={`btn-modifier-key-${idx}`}
                key={idx}
                type="button"
                onClick={() => onInsertText(item.char)}
                className="flex items-center gap-3 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl transition-all hover:scale-[1.02] active:scale-98 text-slate-800 dark:text-slate-200 cursor-pointer text-left"
              >
                <span className="text-lg font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded shadow-sm border border-slate-100 dark:border-slate-700">◌{item.char}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
