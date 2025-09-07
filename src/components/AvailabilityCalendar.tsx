import React, { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import NotesModal from './NotesModal';

function formatLocalDate(date: Date): string {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

const AvailabilityCalendar: React.FC = () => {
  const { data, cycleAvailabilityStatus, getSlotStatus, getHeatmapData, removeAvailability } = useData();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return formatLocalDate(today);
  });
  const [notesModal, setNotesModal] = useState<{ isOpen: boolean; slotId: string; hour: number } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const longPressTimers = useRef<{ [key: number]: NodeJS.Timeout }>({});

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
        date: formatLocalDate(date),
        day: d,
        isToday: date.toDateString() === today.toDateString(),
        isPast: date < today && date.toDateString() !== today.toDateString(),
      });
    }
    return dates;
  };

  const monthDates = generateMonthDates();
  const hours = Array.from({ length: 13 }, (_, i) => i + 10); // 10-22

  const getSlotStatusClass = (status: string | null) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 hover:bg-green-200 border-green-300';
      case 'online':
        return 'bg-blue-100 hover:bg-blue-200 border-blue-300';
      case 'unavailable':
        return 'bg-red-100 hover:bg-red-200 border-red-300';
      default:
        return 'bg-white hover:bg-gray-50 border-gray-200';
    }
  };

  const getSlotIcon = (status: string | null) => {
    switch (status) {
      case 'present':
        return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case 'online':
        return <div className="w-2 h-2 bg-blue-500 rounded-full"></div>;
      case 'unavailable':
        return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      default:
        return null;
    }
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

  const handleSlotClick = (hour: number, day: string) => {
    // Don't allow clicking on past hours
    const now = new Date();
    const slotDate = new Date(day);
    if (slotDate < now && slotDate.toDateString() !== now.toDateString()) return;
    const isPastHour = slotDate.toDateString() === now.toDateString() && hour < now.getHours();
    if (isPastHour) return;
    cycleAvailabilityStatus(day, hour);
  };

  const getNotesForSlot = (day: string, hour: number) => {
    const slotId = `${day}-${hour}`;
    return data.slotNotes.filter(note => note.slotId === slotId);
  };

  // Helper: Get all future hours for the selected date
  const getFutureHours = () => {
    const now = new Date();
    const selected = new Date(selectedDate);
    if (selected > now) {
      return hours;
    } else if (selected.toDateString() === now.toDateString()) {
      return hours.filter(hour => hour >= now.getHours());
    } else {
      return [];
    }
  };

  // Handler: Cycle all future slots
  const handleCycleAllFutureSlots = () => {
    const futureHours = getFutureHours();
    futureHours.forEach(hour => {
      cycleAvailabilityStatus(selectedDate, hour);
    });
  };

  // Handler: Deselect all future slots
  const handleDeselectAllFutureSlots = () => {
    const futureHours = getFutureHours();
    futureHours.forEach(hour => {
      // Remove the slot for this user, day, and hour (set to 'none')
      const slot = data.availability.find(
        slot => slot.day === selectedDate &&
                slot.userId === data.currentUserId &&
                hour >= slot.startHour &&
                hour < slot.endHour
      );
      if (slot) {
        // Remove the slot (set to 'none')
        removeAvailability(slot.id);
      }
    });
  };

  // Remove all slots for the current user that are in the past (set to 'none')
  React.useEffect(() => {
    const now = new Date();
    data.availability.forEach(slot => {
      if (slot.userId !== data.currentUserId) return;
      const slotDate = new Date(slot.day);
      if (slotDate < now && slotDate.toDateString() !== now.toDateString()) {
        removeAvailability(slot.id);
        return;
      }
      if (slotDate.toDateString() === now.toDateString() && slot.endHour <= now.getHours()) {
        removeAvailability(slot.id);
      }
    });
    // eslint-disable-next-line
  }, [data.currentUserId, selectedDate]);

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
      >
        {/* Cycle all future slots button and Deselect all button */}
        {getFutureHours().length > 0 && (
          <div className="flex justify-end p-2 gap-2 bg-gray-50 border-b border-gray-200">
            <button
              className="px-3 py-1 rounded bg-primary-500 text-white font-medium hover:bg-primary-600 transition disabled:opacity-50"
              onClick={handleCycleAllFutureSlots}
              disabled={getFutureHours().length === 0}
              title="Cycle status for all future slots today"
            >
              Alle Markieren
            </button>
            <button
              className="px-3 py-1 rounded bg-gray-300 text-gray-800 font-medium hover:bg-gray-400 transition disabled:opacity-50"
              onClick={handleDeselectAllFutureSlots}
              disabled={getFutureHours().length === 0}
              title="Deselect all future slots today"
            >
              Alle abwählen
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 gap-px bg-gray-200">
          {hours.map((hour) => {
            const slotStatus = getSlotStatus(selectedDate, hour);
            const heatmapClass = getHeatmapIntensity(selectedDate, hour);
            const slotNotes = getNotesForSlot(selectedDate, hour);
            const isPastHour = new Date(selectedDate).toDateString() === new Date().toDateString() && 
                              hour < new Date().getHours();
            const baseStatusClass = getSlotStatusClass(slotStatus);
            const finalClass = slotStatus ? baseStatusClass : (heatmapClass ? `${heatmapClass} hover:opacity-80 border-gray-200` : baseStatusClass);

            // NEU: Alle Nutzer und deren Status für diesen Slot anzeigen
            const slotsForHour = data.availability.filter(slot => slot.day === selectedDate && hour >= slot.startHour && hour < slot.endHour);

            // Long-press logic needs to be inside the map to have a unique timer per slot
            const handleLongPressStart = () => {
              longPressTimers.current[hour] = setTimeout(() => {
                setNotesModal({ isOpen: true, slotId: `${selectedDate}-${hour}`, hour });
              }, 500);
            };
            const handleLongPressEnd = () => {
              if (longPressTimers.current[hour]) {
                clearTimeout(longPressTimers.current[hour]);
                delete longPressTimers.current[hour];
              }
            };

            return (
              <div
                key={hour}
                data-hour={hour}
                data-day={selectedDate}
                className={`flex flex-col justify-center px-2 cursor-pointer touch-manipulation border-l-4 transition-all duration-150 ${isPastHour ? 'bg-gray-50 cursor-not-allowed border-l-gray-300' : finalClass} ${slotsForHour.length > 4 ? 'h-16' : 'h-8'}`}
                onClick={() => !isPastHour && handleSlotClick(hour, selectedDate)}
                onMouseDown={handleLongPressStart}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={handleLongPressStart}
                onTouchEnd={handleLongPressEnd}
              >
                <div className="flex items-center w-full justify-between">
                  <div className="flex items-center min-w-0">
                    <span className="font-mono text-xs flex-shrink-0">{hour}:00</span>
                    <div className="flex flex-wrap gap-1 items-center ml-2 text-xs min-w-0">
                      {slotsForHour.map((slot, idx) => {
                        const name = slot.userId === data.currentUserId ? 'Du' : slot.userId;
                        let color = '';
                        switch (slot.status) {
                          case 'present':
                            color = 'bg-green-100 text-green-700 border-green-300';
                            break;
                          case 'online':
                            color = 'bg-blue-100 text-blue-700 border-blue-300';
                            break;
                          case 'unavailable':
                            color = 'bg-red-100 text-red-700 border-red-300';
                            break;
                          default:
                            color = 'bg-gray-50 text-gray-700 border-gray-200';
                        }
                        return (
                          <span
                            key={name + idx}
                            className={`px-1 py-0.5 rounded border font-medium truncate ${name === 'Du' ? 'font-bold' : ''} ${color}`}
                          >
                            {name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getSlotIcon(slotStatus)}
                    {/* Kommentar-Symbol anzeigen, wenn Notizen vorhanden */}
                    {slotNotes.length > 0 && (
                      <span title="Kommentare vorhanden" className="text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="inline w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8l-4 1 1-4A8.96 8.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Tippe</strong> ein Zeitslot an, um deinen Status zu ändern: {' '}
            <br/>
          <span className="inline-flex items-center mx-1">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
            Vor Ort
          </span> →
          <span className="inline-flex items-center mx-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
            Online
          </span> →
          <span className="inline-flex items-center mx-1">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
            Keine Zeit
          </span> → Vielleicht dabei<br/><br/>
          <strong>Halte gedrückt</strong> um Kommentare zu hinterlassen.
        </p>
      </div>
      
      {/* Current selection summary */}
      {data.availability.filter(slot => slot.day === selectedDate && slot.userId === data.currentUserId).length > 0 && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 font-medium">
            Deine Slots für den {new Date(selectedDate).toLocaleDateString()}:
          </p>
          <div className="mt-1 space-y-1">
            {["present", "online", "unavailable"].map(status => {
              const slotsForStatus = data.availability.filter(
                slot => slot.day === selectedDate && slot.userId === data.currentUserId && slot.status === status
              );
              if (slotsForStatus.length === 0) return null;
              let statusColor = "";
              let statusIcon = "";
              if (status === "present") {
                statusColor = "text-green-600";
                statusIcon = "🟢";
              } else if (status === "online") {
                statusColor = "text-blue-600";
                statusIcon = "🔵";
              } else if (status === "unavailable") {
                statusColor = "text-red-600";
                statusIcon = "🔴";
              }
              let statusLabel = status === "present" ? "Present" : status === "online" ? "Online" : "Unavailable";
              return (
                <div key={status} className={`text-sm ${statusColor}`}>
                  {statusIcon} <span className="capitalize font-medium">{statusLabel}:</span> {' '}
                  {slotsForStatus.map(slot => `${slot.startHour}:00-${slot.endHour}:00`).join(', ')}
                </div>
              );
            })}
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
