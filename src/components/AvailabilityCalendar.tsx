import React, { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import NotesModal from './NotesModal';

const AvailabilityCalendar: React.FC = () => {
  const { data, addAvailability, removeAvailability, getHeatmapData } = useData();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ hour: number } | null>(null);
  const [dragMode, setDragMode] = useState<'add' | 'remove'>('add');
  const [notesModal, setNotesModal] = useState<{ isOpen: boolean; slotId: string; hour: number } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Generate current month dates
  const generateMonthDates = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const dates = [];
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      dates.push({
        date: date.toISOString().split('T')[0],
        day: d,
        isToday: date.toDateString() === today.toDateString(),
        isPast: date < today && date.toDateString() !== today.toDateString(),
      });
    }
    return dates;
  };

  const monthDates = generateMonthDates();
  const hours = Array.from({ length: 13 }, (_, i) => i + 10); // 10-22

  const getAvailabilityForSlot = (day: string, hour: number) => {
    return data.availability.find(
      slot => slot.day === day && 
      slot.userId === data.currentUserId && 
      hour >= slot.startHour && 
      hour < slot.endHour
    );
  };

  const getHeatmapIntensity = (day: string, hour: number) => {
    const heatmap = getHeatmapData(day);
    const count = heatmap[hour] || 0;
    if (count === 0) return '';
    if (count === 1) return 'bg-blue-200';
    if (count === 2) return 'bg-blue-400';
    if (count >= 3) return 'bg-blue-600';
    return '';
  };

  const handleMouseDown = (hour: number, day: string) => {
    if (new Date(day) < new Date() && new Date(day).toDateString() !== new Date().toDateString()) return;
    
    const existingSlot = getAvailabilityForSlot(day, hour);
    setDragMode(existingSlot ? 'remove' : 'add');
    setIsDragging(true);
    setDragStart({ hour });
    
    // Handle single click case - toggle the slot immediately
    if (existingSlot) {
      removeAvailability(existingSlot.id);
    } else {
      // Add availability for single hour
      addAvailability({
        userId: data.currentUserId,
        day,
        startHour: hour,
        endHour: hour + 1,
      });
    }
  };

  const handleMouseEnter = (hour: number, day: string) => {
    if (!isDragging || !dragStart || day !== selectedDate) return;
    
    const startHour = Math.min(dragStart.hour, hour);
    const endHour = Math.max(dragStart.hour, hour) + 1;
    
    // Clear existing availability for current user on this day
    const existingSlots = data.availability.filter(
      slot => slot.day === day && slot.userId === data.currentUserId
    );
    existingSlots.forEach(slot => removeAvailability(slot.id));
    
    // Add new availability if in add mode
    if (dragMode === 'add') {
      addAvailability({
        userId: data.currentUserId,
        day,
        startHour,
        endHour,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleTouchStart = (e: React.TouchEvent, hour: number, day: string) => {
    e.preventDefault();
    handleMouseDown(hour, day);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
    if (element && element.dataset && element.dataset.hour && element.dataset.day) {
      const hour = parseInt(element.dataset.hour);
      const day = element.dataset.day;
      handleMouseEnter(hour, day);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseUp();
  };

  const handleDoubleClick = (hour: number, day: string) => {
    const slotId = `${day}-${hour}`;
    setNotesModal({ isOpen: true, slotId, hour });
  };

  const getNotesForSlot = (day: string, hour: number) => {
    const slotId = `${day}-${hour}`;
    return data.slotNotes.filter(note => note.slotId === slotId);
  };

  return (
    <div className="p-4">
      {/* Month Navigation */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-center">
          {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
      </div>

      {/* Date Selection */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex space-x-1 pb-2">
          {monthDates.map((date) => (
            <button
              key={date.date}
              onClick={() => setSelectedDate(date.date)}
              disabled={date.isPast}
              className={`flex-shrink-0 w-12 h-12 rounded-lg text-sm font-medium touch-manipulation ${
                selectedDate === date.date
                  ? 'bg-primary-500 text-white'
                  : date.isPast
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : date.isToday
                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {date.day}
            </button>
          ))}
        </div>
      </div>

      {/* Time Grid */}
      <div 
        ref={calendarRef}
        className="bg-white rounded-lg border border-gray-200 overflow-hidden"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        <div className="grid grid-cols-1 gap-px bg-gray-200">
          {hours.map((hour) => {
            const isAvailable = getAvailabilityForSlot(selectedDate, hour);
            const heatmapClass = getHeatmapIntensity(selectedDate, hour);
            const slotNotes = getNotesForSlot(selectedDate, hour);
            const isPastHour = new Date(selectedDate).toDateString() === new Date().toDateString() && 
                              hour < new Date().getHours();
            
            return (
              <div
                key={hour}
                data-hour={hour}
                data-day={selectedDate}
                className={`h-12 flex items-center justify-between px-3 cursor-pointer touch-manipulation ${
                  isPastHour
                    ? 'bg-gray-50 cursor-not-allowed'
                    : isAvailable
                    ? 'bg-green-100 hover:bg-green-200'
                    : heatmapClass
                    ? `${heatmapClass} hover:opacity-80`
                    : 'bg-white hover:bg-gray-50'
                }`}
                onMouseDown={() => !isPastHour && handleMouseDown(hour, selectedDate)}
                onMouseEnter={() => handleMouseEnter(hour, selectedDate)}
                onDoubleClick={() => handleDoubleClick(hour, selectedDate)}
                onTouchStart={(e) => !isPastHour && handleTouchStart(e, hour, selectedDate)}
              >
                <span className="text-sm font-medium">
                  {hour.toString().padStart(2, '0')}:00
                </span>
                
                {/* Indicators */}
                <div className="flex items-center space-x-1">
                  {isAvailable && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                  {slotNotes.length > 0 && (
                    <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{slotNotes.length}</span>
                    </div>
                  )}
                  {heatmapClass && !isAvailable && (
                    <span className="text-xs text-blue-700 font-medium">
                      {getHeatmapData(selectedDate)[hour] || 0}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Tippe und ziehe</strong> um deine verfügbaren Zeiten auszuwählen (10:00-22:00).
          <strong>Doppelklicke</strong> einen Slot um ein Kommentar zu hinterlassen.
          Die Zahl gibt an, wie viele Personen in diesem Slot verfügbar sind.
        </p>
      </div>
      
      {/* Current selection summary */}
      {data.availability.filter(slot => slot.day === selectedDate && slot.userId === data.currentUserId).length > 0 && (
        <div className="mt-3 p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700 font-medium">
            Your availability for {new Date(selectedDate).toLocaleDateString()}:
          </p>
          <div className="mt-1 text-sm text-green-600">
            {data.availability
              .filter(slot => slot.day === selectedDate && slot.userId === data.currentUserId)
              .map(slot => `${slot.startHour}:00 - ${slot.endHour}:00`)
              .join(', ')}
          </div>
        </div>
      )}
      
      {/* Notes Modal */}
      <NotesModal
        isOpen={notesModal?.isOpen || false}
        onClose={() => setNotesModal(null)}
        type="slot"
        targetId={notesModal?.slotId || ''}
        title={notesModal ? `${selectedDate} at ${notesModal.hour}:00` : ''}
      />
    </div>
  );
};

export default AvailabilityCalendar;
