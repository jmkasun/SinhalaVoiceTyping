import React from 'react';
import { VoiceNote } from '../types';
import { Clock, Trash2, Calendar, FileText, ChevronRight } from 'lucide-react';

interface HistoryListProps {
  notes: VoiceNote[];
  activeNoteId: string | null;
  onSelectNote: (note: VoiceNote) => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
  onClearAll: () => void;
}

export default function HistoryList({
  notes,
  activeNoteId,
  onSelectNote,
  onDeleteNote,
  onClearAll
}: HistoryListProps) {
  
  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('si-LK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div id="history-panel" className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-pink-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            Saved Notes History
          </h3>
          <span className="bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 text-xs px-2 py-0.5 rounded-full font-bold">
            {notes.length}
          </span>
        </div>
        {notes.length > 0 && (
          <button
            id="btn-clear-all-history"
            onClick={onClearAll}
            className="text-xs text-red-500 hover:text-red-650 font-medium transition-colors cursor-pointer flex items-center gap-1"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto max-h-[380px] pr-1 space-y-2 custom-scrollbar">
        {notes.length === 0 ? (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No saved notes yet</p>
            <p className="text-[11px] mt-1">Transcribe voice and save to see history</p>
          </div>
        ) : (
          notes.map((note) => {
            const isActive = activeNoteId === note.id;
            return (
              <div
                id={`history-item-${note.id}`}
                key={note.id}
                onClick={() => onSelectNote(note)}
                className={`group relative p-3 rounded-xl border text-left cursor-pointer transition-all hover:scale-[1.01] ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-50 to-indigo-50 dark:from-pink-950/20 dark:to-indigo-950/20 border-pink-200 dark:border-pink-900/60'
                    : 'bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-900/40 dark:hover:bg-slate-900 border-slate-100 dark:border-slate-850'
                }`}
              >
                <div className="flex flex-col gap-1 pr-6">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
                    {note.title || 'Untitled note'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {note.text}
                  </p>
                  <div className="flex items-center gap-2.5 mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(note.createdAt)}
                    </span>
                    <span>•</span>
                    <span>{note.text.length} chars</span>
                  </div>
                </div>

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    id={`btn-delete-history-${note.id}`}
                    onClick={(e) => onDeleteNote(note.id, e)}
                    className="p-1.5 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 dark:hover:text-red-400 border border-slate-100 dark:border-slate-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
