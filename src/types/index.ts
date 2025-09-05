export interface AvailabilitySlot {
  id: string;
  userId: string;
  day: string; // YYYY-MM-DD format
  startHour: number; // 10-22
  endHour: number;   // 10-22
  notes?: string;
}

export interface Candidate {
  id: string;
  name: string;
  description: string;
  link?: string;
  assignedSlotId?: string;
  notes?: CandidateNote[];
}

export interface CandidateNote {
  id: string;
  text: string;
  userId: string;
  timestamp: number;
}

export interface SlotNote {
  id: string;
  slotId: string;
  text: string;
  userId: string;
  timestamp: number;
}

export interface AppData {
  availability: AvailabilitySlot[];
  candidates: Candidate[];
  slotNotes: SlotNote[];
  currentUserId: string;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  day: number;
  isCurrentMonth: boolean;
}

export interface TimeSlot {
  day: string; // YYYY-MM-DD
  hour: number; // 10-22
  availableUsers: string[];
  notes: SlotNote[];
}
