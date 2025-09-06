import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppData, AvailabilitySlot, Candidate, SlotNote, AvailabilityStatus } from '../types';

interface ServerVote {
  username: string;
  day: string;
  start: string; // "10:00" format
  end: string;   // "11:00" format
  status: AvailabilityStatus; // available, unavailable, maybe
}

interface AppointmentComment {
  author: string;
  text: string;
  timestamp: number;
}

interface Appointment {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'Vor Ort' | 'Online';
  comments?: AppointmentComment[];
}

interface DataContextType {
  data: AppData;
  currentUser: string | null;
  isLoading: boolean;
  login: (username: string) => Promise<void>;
  logout: () => void;
  addAvailability: (slot: Omit<AvailabilitySlot, 'id'>) => void;
  removeAvailability: (id: string) => void;
  updateAvailability: (id: string, updates: Partial<AvailabilitySlot>) => void;
  cycleAvailabilityStatus: (day: string, hour: number) => void;
  getSlotStatus: (day: string, hour: number) => AvailabilityStatus | null;
  addCandidate: (candidate: Omit<Candidate, 'id'>) => void;
  updateCandidate: (id: string, updates: Partial<Candidate>) => void;
  deleteCandidate: (id: string) => void;
  addSlotNote: (note: Omit<SlotNote, 'id'>) => void;
  getAvailabilityForDay: (day: string) => AvailabilitySlot[];
  getHeatmapData: (day: string) => { [hour: number]: number };
  getBestTimeSlots: (day: string) => { hour: number; userCount: number }[];
  syncWithServer: () => Promise<void>;
  fetchAppointmentsFromServer: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const API_BASE_URL = 'http://localhost:3001/api';
const STORAGE_KEY = 'wg-casting-data';

const initialData: AppData = {
  availability: [],
  candidates: [],
  slotNotes: [],
  appointments: [],
  currentUserId: '',
};

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const [data, setData] = useState<AppData>(initialData);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Helper functions for server communication
  const convertAvailabilityToServerVotes = (availability: AvailabilitySlot[]): ServerVote[] => {
    return availability.map(slot => ({
      username: slot.userId,
      day: slot.day,
      start: `${slot.startHour.toString().padStart(2, '0')}:00`,
      end: `${slot.endHour.toString().padStart(2, '0')}:00`,
      status: slot.status,
    }));
  };

  const convertServerVotesToAvailability = (votes: ServerVote[]): AvailabilitySlot[] => {
    return votes.map(vote => ({
      id: `${vote.username}-${vote.day}-${vote.start}-${vote.end}-${vote.status}`,
      userId: vote.username,
      day: vote.day,
      startHour: parseInt(vote.start.split(':')[0]),
      endHour: parseInt(vote.end.split(':')[0]),
      status: vote.status || 'available', // fallback for backwards compatibility
    }));
  };

  // Kandidaten aus Backend laden
  const fetchCandidatesFromServer = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/candidates`);
      if (response.ok) {
        const candidates = await response.json();
        setData(prev => ({ ...prev, candidates }));
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  };

  // Kandidaten ins Backend speichern (jetzt einzelnes Objekt)
  const saveCandidateToServer = async (candidate: Candidate) => {
    try {
      const response = await fetch(`${API_BASE_URL}/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate),
      });
      if (!response.ok) {
        throw new Error('Failed to save candidate');
      }
    } catch (error) {
      console.error('Error saving candidate:', error);
    }
  };

  // Kommentare aus Backend laden
  const fetchSlotNotesFromServer = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/slotNotes`);
      if (response.ok) {
        const slotNotes = await response.json();
        setData(prev => ({ ...prev, slotNotes }));
      }
    } catch (error) {
      console.error('Error fetching slotNotes:', error);
    }
  };

  // Kommentare ins Backend speichern
  const saveSlotNotesToServer = async (slotNotes: SlotNote[]) => {
    try {
      const response = await fetch(`${API_BASE_URL}/slotNotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotNotes }),
      });
      if (!response.ok) {
        throw new Error('Failed to save slotNotes');
      }
    } catch (error) {
      console.error('Error saving slotNotes:', error);
    }
  };

  // Termine aus Backend laden
  const fetchAppointmentsFromServer = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/appointments`);
      if (response.ok) {
        const appointments = await response.json();
        setData(prev => ({ ...prev, appointments }));
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  // Load candidates, notes und aktuellen Nutzer aus localStorage
  useEffect(() => {
    fetchCandidatesFromServer();
    fetchSlotNotesFromServer();
    // NEU: Nutzer aus localStorage laden
    const storedUser = localStorage.getItem('wg-casting-user');
    if (storedUser) {
      setCurrentUser(storedUser);
      setData(prev => ({ ...prev, currentUserId: storedUser }));
      syncWithServer();
    }
  }, []);

  // useEffect: Kommentare ins Backend speichern
  useEffect(() => {
    saveSlotNotesToServer(data.slotNotes);
  }, [data.slotNotes]);

  // useEffect: Votes ins Backend speichern, wenn sich data.availability ändert
  useEffect(() => {
    if (currentUser) {
      submitVotesToServer();
    }
  }, [data.availability]);

  const syncWithServer = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/votes`);
      if (response.ok) {
        const serverVotes = await response.json();
        // NEU: Alle Votes (inkl. eigene) aus dem Backend übernehmen
        const availability = convertServerVotesToAvailability(serverVotes);
        setData(prev => ({ ...prev, availability }));
      }
    } catch (error) {
      console.error('Error syncing with server:', error);
    }
  };

  const submitVotesToServer = async () => {
    if (!currentUser) return;

    const userAvailability = data.availability.filter(slot => slot.userId === currentUser);
    const serverVotes = convertAvailabilityToServerVotes(userAvailability);

    try {
      const response = await fetch(`${API_BASE_URL}/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: currentUser,
          votes: serverVotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit votes');
      }

      // Sync direkt nach erfolgreicher Speicherung im Backend
      await syncWithServer();
    } catch (error) {
      console.error('Error submitting votes:', error);
    }
  };

  const login = async (username: string) => {
    setIsLoading(true);
    try {
      setCurrentUser(username);
      setData(prev => ({ ...prev, currentUserId: username }));
      localStorage.setItem('wg-casting-user', username); // NEU: Nutzer speichern
      await syncWithServer();
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
    setIsLoading(false);
  };

  const logout = () => {
    setCurrentUser(null);
    setData(initialData);
    localStorage.removeItem('wg-casting-user'); // NEU: Nutzer entfernen
  };

  // Slot-Methoden
  const addAvailability = (slot: Omit<AvailabilitySlot, 'id'>) => {
    const newSlot: AvailabilitySlot = {
      ...slot,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setData(prev => ({
      ...prev,
      availability: [...prev.availability, newSlot],
    }));
  };

  const removeAvailability = (id: string) => {
    setData(prev => ({
      ...prev,
      availability: prev.availability.filter(slot => slot.id !== id),
    }));
  };

  const updateAvailability = (id: string, updates: Partial<AvailabilitySlot>) => {
    setData(prev => ({
      ...prev,
      availability: prev.availability.map(slot => 
        slot.id === id ? { ...slot, ...updates, id: Date.now().toString() + Math.random().toString(36).substr(2, 9) } : slot
      ),
    }));
  };

  // Kandidaten-Methoden
  const addCandidate = async (candidate: Omit<Candidate, 'id'>) => {
    const newCandidate: Candidate = {
      ...candidate,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      besichtigungStatus: 'offen',
      castingStatus: 'offen',
      votes: {},
      notes: [],
    };
    try {
      await saveCandidateToServer(newCandidate);
      fetchCandidatesFromServer(); // Nach dem Speichern neu laden
    } catch (error) {
      console.error('Error adding candidate:', error);
    }
  };

  const updateCandidate = async (id: string, updates: Partial<Candidate>) => {
    setData(prev => ({
      ...prev,
      candidates: prev.candidates.map(candidate =>
        candidate.id === id ? { ...candidate, ...updates } : candidate
      ),
    }));
    try {
      const response = await fetch(`${API_BASE_URL}/candidates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        fetchCandidatesFromServer(); // Nach Update neu laden
      }
    } catch (error) {
      console.error('Error updating candidate:', error);
    }
  };

  const deleteCandidate = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/candidates/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchCandidatesFromServer();
      }
    } catch (error) {
      console.error('Error deleting candidate:', error);
    }
    setData(prev => ({
      ...prev,
      candidates: prev.candidates.filter(candidate => candidate.id !== id),
    }));
  };

  // Kommentar-Methode
  const addSlotNote = (note: Omit<SlotNote, 'id'>) => {
    const newNote: SlotNote = {
      ...note,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setData(prev => {
      const updated = { ...prev, slotNotes: [...prev.slotNotes, newNote] };
      saveSlotNotesToServer(updated.slotNotes); // Backend-Speicherung direkt nach Update
      return updated;
    });
  };

  const getAvailabilityForDay = (day: string): AvailabilitySlot[] => {
    return data.availability.filter(slot => slot.day === day);
  };

  const getHeatmapData = (day: string): { [hour: number]: number } => {
    const heatmap: { [hour: number]: number } = {};
    
    // Initialize hours 10-22 with 0
    for (let hour = 10; hour <= 22; hour++) {
      heatmap[hour] = 0;
    }
    
    // Count available users for each hour (all users, not just current user)
    const daySlots = getAvailabilityForDay(day);
    daySlots.forEach(slot => {
      // Count slots marked as 'present' or 'online'
      if (slot.status === 'present' || slot.status === 'online') {
        for (let hour = slot.startHour; hour < slot.endHour; hour++) {
          heatmap[hour]++;
        }
      }
    });
    
    return heatmap;
  };

  const getBestTimeSlots = (day: string): { hour: number; userCount: number }[] => {
    const heatmap = getHeatmapData(day);
    return Object.entries(heatmap)
      .map(([hour, count]) => ({ hour: parseInt(hour), userCount: count }))
      .filter(slot => slot.userCount > 0)
      .sort((a, b) => b.userCount - a.userCount);
  };

  // Kandidaten-Vote (Daumen hoch/runter) setzen
  const voteCandidate = async (candidateId: string, vote: 'up' | 'down') => {
    if (!currentUser) return;
    const candidate = data.candidates.find(c => c.id === candidateId);
    if (!candidate) return;
    const updatedVotes = { ...candidate.votes, [currentUser]: vote };
    await updateCandidate(candidateId, { votes: updatedVotes });
  };

  const getSlotStatus = (day: string, hour: number): AvailabilityStatus | null => {
    const slot = data.availability.find(
      slot => slot.day === day && 
      slot.userId === data.currentUserId && 
      hour >= slot.startHour && 
      hour < slot.endHour
    );
    return slot ? slot.status : null;
  };

  const cycleAvailabilityStatus = (day: string, hour: number) => {
    if (!currentUser) return;
    
    // Find existing slot for this hour
    const existingSlot = data.availability.find(
      slot => slot.day === day && 
      slot.userId === currentUser && 
      hour >= slot.startHour && 
      hour < slot.endHour
    );
    
    if (existingSlot) {
      // Cycle through states: present -> online -> unavailable -> remove
      const currentStatus = existingSlot.status;
      let newStatus: AvailabilityStatus | null = null;
      switch (currentStatus) {
        case 'present':
          newStatus = 'online';
          break;
        case 'online':
          newStatus = 'unavailable';
          break;
        case 'unavailable':
          // Remove the slot (return to default/nothing state)
          removeAvailability(existingSlot.id);
          return;
      }
      if (newStatus) {
        updateAvailability(existingSlot.id, { status: newStatus });
      }
    } else {
      // No existing slot, create new one with 'present' status
      addAvailability({
        userId: currentUser,
        day,
        startHour: hour,
        endHour: hour + 1,
        status: 'present',
      });
    }
  };

  // Im Context bereitstellen
  return (
    <DataContext.Provider
      value={{
        data,
        currentUser,
        isLoading,
        login,
        logout,
        addAvailability,
        removeAvailability,
        updateAvailability,
        cycleAvailabilityStatus,
        getSlotStatus,
        addCandidate,
        updateCandidate,
        deleteCandidate,
        addSlotNote,
        getAvailabilityForDay,
        getHeatmapData,
        getBestTimeSlots,
        syncWithServer,
        fetchAppointmentsFromServer, // NEU
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
