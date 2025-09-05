import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppData, AvailabilitySlot, Candidate, SlotNote } from '../types';

interface ServerVote {
  username: string;
  day: string;
  start: string; // "10:00" format
  end: string;   // "11:00" format
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
  addCandidate: (candidate: Omit<Candidate, 'id'>) => void;
  updateCandidate: (id: string, updates: Partial<Candidate>) => void;
  deleteCandidate: (id: string) => void;
  addSlotNote: (note: Omit<SlotNote, 'id'>) => void;
  getAvailabilityForDay: (day: string) => AvailabilitySlot[];
  getHeatmapData: (day: string) => { [hour: number]: number };
  getBestTimeSlots: (day: string) => { hour: number; userCount: number }[];
  syncWithServer: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const API_BASE_URL = 'http://localhost:3001/api';
const STORAGE_KEY = 'wg-casting-data';

const initialData: AppData = {
  availability: [],
  candidates: [],
  slotNotes: [],
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
    }));
  };

  const convertServerVotesToAvailability = (votes: ServerVote[]): AvailabilitySlot[] => {
    return votes.map(vote => ({
      id: `${vote.username}-${vote.day}-${vote.start}-${vote.end}`,
      userId: vote.username,
      day: vote.day,
      startHour: parseInt(vote.start.split(':')[0]),
      endHour: parseInt(vote.end.split(':')[0]),
    }));
  };

  // Load candidates and notes from localStorage (keeping these local for now)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setData(prev => ({
          ...prev,
          candidates: parsed.candidates || [],
          slotNotes: parsed.slotNotes || [],
        }));
      } catch (error) {
        console.error('Failed to parse stored data:', error);
      }
    }
  }, []);

  // Save candidates and notes to localStorage
  useEffect(() => {
    const dataToStore = {
      candidates: data.candidates,
      slotNotes: data.slotNotes,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
  }, [data.candidates, data.slotNotes]);

  const syncWithServer = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/votes`);
      if (response.ok) {
        const serverVotes = await response.json();
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

      // Sync back from server to get updated heatmap
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
      
      // Load data from server
      await syncWithServer();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setData(initialData);
  };

  const addAvailability = (slot: Omit<AvailabilitySlot, 'id'>) => {
    const newSlot: AvailabilitySlot = {
      ...slot,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setData(prev => ({
      ...prev,
      availability: [...prev.availability, newSlot],
    }));
    
    // Submit to server after a short delay to allow for drag operations
    setTimeout(() => {
      submitVotesToServer();
    }, 500);
  };

  const removeAvailability = (id: string) => {
    setData(prev => ({
      ...prev,
      availability: prev.availability.filter(slot => slot.id !== id),
    }));
    
    // Submit to server after a short delay
    setTimeout(() => {
      submitVotesToServer();
    }, 500);
  };

  const updateAvailability = (id: string, updates: Partial<AvailabilitySlot>) => {
    setData(prev => ({
      ...prev,
      availability: prev.availability.map(slot => 
        slot.id === id ? { ...slot, ...updates } : slot
      ),
    }));
    
    // Submit to server after a short delay
    setTimeout(() => {
      submitVotesToServer();
    }, 500);
  };

  const addCandidate = (candidate: Omit<Candidate, 'id'>) => {
    const newCandidate: Candidate = {
      ...candidate,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setData(prev => ({
      ...prev,
      candidates: [...prev.candidates, newCandidate],
    }));
  };

  const updateCandidate = (id: string, updates: Partial<Candidate>) => {
    setData(prev => ({
      ...prev,
      candidates: prev.candidates.map(candidate => 
        candidate.id === id ? { ...candidate, ...updates } : candidate
      ),
    }));
  };

  const deleteCandidate = (id: string) => {
    setData(prev => ({
      ...prev,
      candidates: prev.candidates.filter(candidate => candidate.id !== id),
    }));
  };

  const addSlotNote = (note: Omit<SlotNote, 'id'>) => {
    const newNote: SlotNote = {
      ...note,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setData(prev => ({
      ...prev,
      slotNotes: [...prev.slotNotes, newNote],
    }));
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
      for (let hour = slot.startHour; hour < slot.endHour; hour++) {
        heatmap[hour]++;
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

  const contextValue: DataContextType = {
    data,
    currentUser,
    isLoading,
    login,
    logout,
    addAvailability,
    removeAvailability,
    updateAvailability,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    addSlotNote,
    getAvailabilityForDay,
    getHeatmapData,
    getBestTimeSlots,
    syncWithServer,
  };

  return (
    <DataContext.Provider value={contextValue}>
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
