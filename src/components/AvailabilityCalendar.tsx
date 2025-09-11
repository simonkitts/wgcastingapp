import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';

function formatLocalDate(date: Date): string {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

const AvailabilityCalendar: React.FC = () => {
  const { data, cycleAvailabilityStatus, getSlotStatus, removeAvailability, addSlotNote } = useData();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return formatLocalDate(today);
  });
  const calendarRef = useRef<HTMLDivElement>(null);
  const dateListRef = useRef<HTMLDivElement>(null);

  // New: local state for day-level comment input
  const [dayComment, setDayComment] = useState('');

  // NEW: appointment helpers
  const hasAppointmentsOnDate = (day: string) => data.appointments.some(app => app.date === day);
/*  const isHourWithinAnyAppointment = (day: string, hour: number) => {
    const slotStart = hour * 60;
    const slotEnd = (hour + 1) * 60;
    return data.appointments.some(app => {
      if (app.date !== day) return false;
      const [sh, sm] = app.startTime.split(':').map(Number);
      const [eh, em] = app.endTime.split(':').map(Number);
      const apptStart = sh * 60 + (isNaN(sm) ? 0 : sm);
      const apptEnd = eh * 60 + (isNaN(em) ? 0 : em);
      return apptStart < slotEnd && apptEnd > slotStart;
    });
  };*/

  // Generate current month dates
  const generateMonthDates = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const dates = [] as Array<{ date: string; day: number; isToday: boolean; isPast: boolean; weekday: string }>;
    const weekDays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      dates.push({
        date: formatLocalDate(date),
        day: d,
        isToday: date.toDateString() === today.toDateString(),
        isPast: date < today && date.toDateString() !== today.toDateString(),
        weekday: weekDays[date.getDay()],
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

  const handleSlotClick = (hour: number, day: string) => {
    // Don't allow clicking on past hours
    const now = new Date();
    const slotDate = new Date(day);
    if (slotDate < now && slotDate.toDateString() !== now.toDateString()) return;
    const isPastHour = slotDate.toDateString() === now.toDateString() && hour < now.getHours();
    if (isPastHour) return;
    cycleAvailabilityStatus(day, hour);
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

  // On mount: position the horizontal scrollbar so today's day button is at the left edge (no animation)
  useEffect(() => {
    const container = dateListRef.current;
    if (!container) return;

    const alignLeft = () => {
      const todayStr = formatLocalDate(new Date());
      const btn = container.querySelector(`button[data-date="${todayStr}"]`) as HTMLButtonElement | null;
      if (btn) {
        // Robust to varying paddings/margins and screen sizes
        btn.scrollIntoView({ behavior: 'auto', inline: 'start', block: 'nearest' });
      }
    };

    const raf = requestAnimationFrame(() => {
      alignLeft();
      requestAnimationFrame(alignLeft);
    });

    const onResize = () => alignLeft();
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [monthDates]);

  // New: day-level notes helpers
  const dayNotes = data.slotNotes.filter(n => n.slotId === selectedDate);
  const handleAddDayNote = () => {
    const text = dayComment.trim();
    if (!text) return;
    if (!data.currentUserId) return;
    addSlotNote({ slotId: selectedDate, text, userId: data.currentUserId, timestamp: Date.now() });
    setDayComment('');
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
      <div className="mb-4 overflow-x-auto" ref={dateListRef}>
        <div className="flex space-x-1 pb-2">
          {monthDates.map((date) => (
            <button
              key={date.date}
              data-date={date.date}
              onClick={() => setSelectedDate(date.date)}
              disabled={date.isPast}
              className={`relative flex-shrink-0 w-12 h-12 rounded-lg text-sm font-medium touch-manipulation flex flex-col items-center justify-center ${
                selectedDate === date.date
                  ? 'bg-primary-500 text-white'
                  : date.isPast
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : date.isToday
                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-[10px] leading-none mb-0.5">{date.weekday}</span>
              <span className="leading-none">{date.day}</span>
              {/* NEW: Show notification dot for days with appointments */}
              {hasAppointmentsOnDate(date.date) && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              )}
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
            const isPastHour = new Date(selectedDate).toDateString() === new Date().toDateString() &&
                              hour < new Date().getHours();

            // Alle Nutzer und deren Status für diesen Slot anzeigen
            const slotsForHour = data.availability.filter(slot => slot.day === selectedDate && hour >= slot.startHour && hour < slot.endHour);

            // NEW: Check if this hour has an appointment and collect them
            const slotStart = hour * 60;
            const slotEnd = (hour + 1) * 60;
            const hourAppointments = data.appointments.filter(app => {
              if (app.date !== selectedDate) return false;
              const [sh, sm] = app.startTime.split(':').map(Number);
              const [eh, em] = app.endTime.split(':').map(Number);
              const apptStart = (sh || 0) * 60 + (isNaN(sm) ? 0 : sm);
              const apptEnd = (eh || 0) * 60 + (isNaN(em) ? 0 : em);
              return apptStart < slotEnd && apptEnd > slotStart;
            });
            const hasAppt = hourAppointments.length > 0;

            return (
              <div
                key={hour}
                data-hour={hour}
                data-day={selectedDate}
                className={`flex flex-col justify-center px-2 cursor-pointer touch-manipulation border-l-4 transition-all duration-150 ${
                  isPastHour ? 'bg-gray-50 cursor-not-allowed border-l-gray-300' : getSlotStatusClass(slotStatus)
                } ${slotsForHour.length > 4 ? 'h-16' : 'h-10'} ${hasAppt ? 'border-l-amber-500' : ''}`}
                onClick={() => !isPastHour && handleSlotClick(hour, selectedDate)}
                title={hasAppt ? 'Termin in diesem Zeitraum' : undefined}
              >
                <div className="flex items-center w-full justify-between">
                  <div className="flex items-center min-w-0">
                    <span className="font-mono text-xs flex-shrink-0">{hour}:00</span>
                    <div className="flex flex-wrap gap-1 items-center ml-2 text-xs min-w-0">
                      {slotsForHour.map((slot, idx) => {
                        const name = slot.userId === data.currentUserId ? 'Du' : slot.userId;
                        let color: string;
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
                  </div>
                </div>
                {hasAppt && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {hourAppointments.map(app => (
                      <span key={app.id} className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-medium truncate">
                        {app.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* New: Day-level comments section inside calendar div */}
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800">Kommentare für {new Date(selectedDate).toLocaleDateString()}</h3>
          </div>
          {dayNotes.length > 0 ? (
            <ul className="space-y-2 mb-3 max-h-40 overflow-auto pr-1">
              {dayNotes
                .sort((a, b) => a.timestamp - b.timestamp)
                .map(n => (
                  <li key={n.id} className="text-sm text-gray-700 bg-gray-50 rounded p-2 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{n.userId === data.currentUserId ? 'Du' : n.userId}</span>
                      <span className="text-xs text-gray-500">{new Date(n.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="mt-1 whitespace-pre-wrap break-words">{n.text}</div>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 mb-3">Noch keine Kommentare für diesen Tag.</p>
          )}
          <div className="flex items-start gap-2">
            <textarea
              value={dayComment}
              onChange={(e) => setDayComment(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              placeholder="Kommentar für diesen Tag hinzufügen..."
              rows={2}
            />
            <button
              onClick={handleAddDayNote}
              className="px-3 py-2 rounded bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
              disabled={!dayComment.trim() || !data.currentUserId}
              title={!data.currentUserId ? 'Bitte zuerst anmelden' : 'Kommentar hinzufügen'}
            >
              Hinzufügen
            </button>
          </div>
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
          <strong>Kommentare</strong> kannst du unten für jeden Tag hinzufügen.
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
    </div>
  );
};

export default AvailabilityCalendar;
