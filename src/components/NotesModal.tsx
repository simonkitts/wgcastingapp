import React, { useState } from 'react';
import { useData } from '../context/DataContext';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'slot' | 'candidate';
  targetId: string;
  title: string;
}

const NotesModal: React.FC<NotesModalProps> = ({
  isOpen,
  onClose,
  type,
  targetId,
  title,
}) => {
  const { data, addSlotNote, updateCandidate } = useData();
  const [newNote, setNewNote] = useState('');

  if (!isOpen) return null;

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    if (type === 'slot') {
      addSlotNote({
        slotId: targetId,
        text: newNote.trim(),
        userId: data.currentUserId,
        timestamp: Date.now(),
      });
    } else if (type === 'candidate') {
      const candidate = data.candidates.find(c => c.id === targetId);
      if (candidate) {
        const newCandidateNote = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          text: newNote.trim(),
          userId: data.currentUserId,
          timestamp: Date.now(),
        };
        
        const updatedNotes = [...(candidate.notes || []), newCandidateNote];
        updateCandidate(targetId, { notes: updatedNotes });
      }
    }
    
    setNewNote('');
  };

  const getNotesForTarget = () => {
    if (type === 'slot') {
      return data.slotNotes.filter(note => note.slotId === targetId);
    } else if (type === 'candidate') {
      const candidate = data.candidates.find(c => c.id === targetId);
      return candidate?.notes || [];
    }
    return [];
  };

  const notes = getNotesForTarget();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-96 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Notes: {title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Notes List */}
        <div className="p-4 max-h-48 overflow-y-auto">
          {notes.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              Noch keine Kommentare vorhanden :/
            </p>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-800 mb-1">{note.text}</p>
                  <p className="text-xs text-gray-500">
                    {note.userId ? `Verfasser: ${note.userId} | ` : ''}{new Date(note.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Note Form */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Kommentar hinzufügen..."
              className="border px-2 py-1 text-xs w-full rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            />
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              className="bg-primary-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-primary-600 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hinzufügen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesModal;
