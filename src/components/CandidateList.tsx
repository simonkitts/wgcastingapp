import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Candidate } from '../types';
import NotesModal from './NotesModal';
import AppointmentModal from './AppointmentModal';

const CandidateList: React.FC = () => {
  const { data, addCandidate, updateCandidate, deleteCandidate, getBestTimeSlots, fetchCandidatesFromServer } = useData();
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<string | null>(null);
  const [notesModal, setNotesModal] = useState<{ isOpen: boolean; candidateId: string; candidateName: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    link: '',
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [appointmentModal, setAppointmentModal] = useState<{
    open: boolean;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    type: 'Vor Ort' | 'Online';
  } | null>(null);

  useEffect(() => {
    // Ensure candidates are loaded when this tab mounts
    fetchCandidatesFromServer();
  }, []);

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
      // Lokales Datum statt UTC
      const dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
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

  const handleStatusCycle = (candidate: Candidate, type: 'besichtigung' | 'casting') => {
    const statusKey = type === 'besichtigung' ? 'besichtigungStatus' : 'castingStatus';
    const current = candidate[statusKey];
    const next = current === 'geplant' ? 'abgeschlossen' : 'geplant';
    updateCandidate(candidate.id, { [statusKey]: next });
  };

  const handleVote = (candidate: Candidate, vote: 'up' | 'down') => {
    if (!data.currentUserId) return;
    const newVotes = { ...candidate.votes, [data.currentUserId]: vote };
    updateCandidate(candidate.id, { votes: newVotes });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kandidaten</h2>
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
                Beschreibung
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
      <div className="space-y-2">
        {data.candidates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Noch keine Kandidaten :/</p>
            <p className="text-sm">Drücke "Kandidat Hinzufügen"</p>
          </div>
        ) : (
          data.candidates.map(candidate => {
            const recommendedTimes = getRecommendedTimes(candidate.id);
            const isExpanded = expandedId === candidate.id;
            return (
              <div key={candidate.id} className="border rounded px-3 py-2 mb-2 flex flex-col bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-semibold cursor-pointer hover:underline"
                      onClick={() => setExpandedId(isExpanded ? null : candidate.id)}
                    >
                      {candidate.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs text-white ${candidate.besichtigungStatus === 'abgeschlossen' ? 'bg-green-600' : candidate.besichtigungStatus === 'geplant' ? 'bg-yellow-500' : 'bg-gray-400'}`}
                          onClick={() => handleStatusCycle(candidate, 'besichtigung')}
                          style={{ cursor: 'pointer' }}>
                      Besichtigung {candidate.besichtigungStatus === 'abgeschlossen' ? '✔' : candidate.besichtigungStatus === 'geplant' ? '⏳' : '–'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs text-white ${candidate.castingStatus === 'abgeschlossen' ? 'bg-green-600' : candidate.castingStatus === 'geplant' ? 'bg-yellow-500' : 'bg-gray-400'}`}
                          onClick={() => handleStatusCycle(candidate, 'casting')}
                          style={{ cursor: 'pointer' }}>
                      Casting {candidate.castingStatus === 'abgeschlossen' ? '✔' : candidate.castingStatus === 'geplant' ? '⏳' : '–'}
                    </span>
                  </div>
                  <div className="flex gap-1 items-center">
                    <button onClick={() => handleVote(candidate, 'up')} className={`ml-2 text-primary-500 hover:text-primary-700 focus:outline-none w-6 h-6 flex items-center justify-center rounded ${candidate.votes?.[data.currentUserId] === 'up' ? 'bg-green-100' : ''}`}
                      title="Daumen hoch">
                      👍
                    </button>
                    <button onClick={() => handleVote(candidate, 'down')} className={`ml-2 text-primary-500 hover:text-primary-700 focus:outline-none w-6 h-6 flex items-center justify-center rounded ${candidate.votes?.[data.currentUserId] === 'down' ? 'bg-red-100' : ''}`}
                      title="Daumen runter">
                      👎
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-2 text-sm text-gray-700">
                    {candidate.description && <div className="mb-1">{candidate.description}</div>}
                    {candidate.link && (
                      <div className="mb-1">
                        <a href={candidate.link} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">
                          {(() => {
                            try {
                              const url = new URL(candidate.link);
                              const parts = url.hostname.split('.');
                              return parts.length > 1 ? parts[parts.length - 2] : url.hostname;
                            } catch {
                              return candidate.link;
                            }
                          })()}
                        </a>
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleEdit(candidate)} className="px-2 py-1 text-xs bg-blue-100 rounded hover:bg-blue-200 text-blue-700 border border-blue-200 font-medium">Bearbeiten</button>
                      <button onClick={() => handleDelete(candidate.id)} className="px-2 py-1 text-xs bg-red-100 rounded hover:bg-red-200 text-red-700 border border-red-200 font-medium">Löschen</button>
                    </div>
                    {candidate.votes && Object.entries(candidate.votes).length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">Abstimmungen: {Object.entries(candidate.votes).map(([user, v]) => `${user}: ${v === 'up' ? '👍' : '👎'}`).join(', ')}</div>
                    )}
                    {recommendedTimes.length > 0 && (
                      <div className="border-t border-gray-100 pt-2 mt-2">
                        <div className="mb-1 font-medium">Empfohlene Zeiten:</div>
                        <div className="flex flex-wrap gap-2">
                          {recommendedTimes.map((timeSlot: any, index: number) => (
                            <button
                              key={index}
                              onClick={() => setAppointmentModal({
                                open: true,
                                title: candidate.name,
                                date: timeSlot.date,
                                startTime: `${timeSlot.bestSlot.hour.toString().padStart(2, '0')}:00`,
                                endTime: `${(timeSlot.bestSlot.hour + 1).toString().padStart(2, '0')}:00`,
                                type: 'Vor Ort',
                              })}
                              className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium hover:bg-blue-100 touch-manipulation"
                            >
                              {timeSlot.displayDate} {timeSlot.bestSlot.hour}:00
                              <span className="ml-1 text-blue-500">
                                ({timeSlot.bestSlot.userCount} verfügbar)
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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

      {/* AppointmentModal für Kandidaten */}
      {appointmentModal && (
        <AppointmentModal
          open={appointmentModal.open}
          initialTitle={appointmentModal.title}
          initialDate={appointmentModal.date}
          initialStartTime={appointmentModal.startTime}
          initialEndTime={appointmentModal.endTime}
          initialType={appointmentModal.type}
          onSave={async (form) => {
            await fetch('/api/appointments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...form, comments: [] }),
            });
            setAppointmentModal(null);
          }}
          onCancel={() => setAppointmentModal(null)}
        />
      )}
    </div>
  );
};

export default CandidateList;
