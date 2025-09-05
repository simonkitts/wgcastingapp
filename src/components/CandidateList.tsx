import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Candidate } from '../types';
import NotesModal from './NotesModal';

const CandidateList: React.FC = () => {
  const { data, addCandidate, updateCandidate, deleteCandidate, getBestTimeSlots } = useData();
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<string | null>(null);
  const [notesModal, setNotesModal] = useState<{ isOpen: boolean; candidateId: string; candidateName: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    link: '',
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', link: '' });
    setIsAddingCandidate(false);
    setEditingCandidate(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingCandidate) {
      updateCandidate(editingCandidate, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        link: formData.link.trim() || undefined,
      });
    } else {
      addCandidate({
        name: formData.name.trim(),
        description: formData.description.trim(),
        link: formData.link.trim() || undefined,
      });
    }
    resetForm();
  };

  const handleEdit = (candidate: Candidate) => {
    setFormData({
      name: candidate.name,
      description: candidate.description,
      link: candidate.link || '',
    });
    setEditingCandidate(candidate.id);
    setIsAddingCandidate(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bist du sicher, dass du diesen Kandidaten löschen möchtest?')) {
      deleteCandidate(id);
    }
  };

  const getRecommendedTimes = (candidateId: string) => {
    const today = new Date();
    const dates = [];
    
    // Get next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const bestSlots = getBestTimeSlots(dateStr);
      
      if (bestSlots.length > 0) {
        dates.push({
          date: dateStr,
          displayDate: date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
          bestSlot: bestSlots[0],
        });
      }
    }
    
    return dates.slice(0, 3); // Show top 3 recommendations
  };

  const assignCandidateToSlot = (candidateId: string, slotId: string) => {
    updateCandidate(candidateId, { assignedSlotId: slotId });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kandidat</h2>
        <button
          onClick={() => setIsAddingCandidate(true)}
          className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 touch-manipulation"
        >
          + Kandidaten Hinzufügen
        </button>
      </div>

      {/* Add/Edit Form */}
      {isAddingCandidate && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="font-medium mb-3">
            {editingCandidate ? 'Kandidaten bearbeiten' : 'Neuen Kandidaten hinzufügen'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Kandidatenname"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Kurze Beschreibung"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link (Optional)
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Instagram oder so"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-primary-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-600 touch-manipulation"
              >
                  Kandidat {editingCandidate ? 'Bearbeiten' : 'Hinzufügen'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 touch-manipulation"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Candidates List */}
      <div className="space-y-3">
        {data.candidates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No candidates yet.</p>
            <p className="text-sm">Drücke "Kandidat Hinzufügen" um zu starten</p>
          </div>
        ) : (
          data.candidates.map((candidate) => {
            const recommendedTimes = getRecommendedTimes(candidate.id);
            
            return (
              <div key={candidate.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                {/* Candidate Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{candidate.name}</h3>
                    {candidate.assignedSlotId && (
                      <div className="mt-1">
                        <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                          Geplant
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setNotesModal({ isOpen: true, candidateId: candidate.id, candidateName: candidate.name })}
                      className="text-yellow-600 hover:text-yellow-700 text-sm touch-manipulation p-1"
                    >
                      Notes ({candidate.notes?.length || 0})
                    </button>
                    <button
                      onClick={() => handleEdit(candidate)}
                      className="text-blue-600 hover:text-blue-700 text-sm touch-manipulation p-1"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDelete(candidate.id)}
                      className="text-red-600 hover:text-red-700 text-sm touch-manipulation p-1"
                    >
                      Löschen
                    </button>
                  </div>
                </div>

                {/* Description */}
                {candidate.description && (
                  <p className="text-gray-600 text-sm mb-3">{candidate.description}</p>
                )}

                {/* Link */}
                {candidate.link && (
                  <div className="mb-3">
                    <a
                      href={candidate.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 text-sm underline touch-manipulation"
                    >
                      Kandidat ansehen →
                    </a>
                  </div>
                )}

                {/* Recommended Times */}
                {recommendedTimes.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Die Besten Zeiten um einen Kandidaten einzuplanen:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {recommendedTimes.map((timeSlot, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            const slotId = `${timeSlot.date}-${timeSlot.bestSlot.hour}`;
                            assignCandidateToSlot(candidate.id, slotId);
                          }}
                          className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium hover:bg-blue-100 touch-manipulation"
                        >
                          {timeSlot.displayDate} at {timeSlot.bestSlot.hour}:00
                          <span className="ml-1 text-blue-500">
                            ({timeSlot.bestSlot.userCount} verfügbar)
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Notes Modal */}
      <NotesModal
        isOpen={notesModal?.isOpen || false}
        onClose={() => setNotesModal(null)}
        type="candidate"
        targetId={notesModal?.candidateId || ''}
        title={notesModal?.candidateName || ''}
      />
    </div>
  );
};

export default CandidateList;
