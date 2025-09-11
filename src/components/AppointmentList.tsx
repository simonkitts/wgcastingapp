import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

export type AppointmentType = 'Vor Ort' | 'Online';

// Backend-kompatibler Typ
interface AppointmentComment {
  author?: string;
  text: string;
  timestamp: number;
}
interface Appointment {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: AppointmentType;
  comments?: AppointmentComment[];
}

const AppointmentList: React.FC = () => {
  const { data, fetchAppointmentsFromServer, currentUser, addAppointment, updateAppointment, deleteAppointment, addAppointmentComment } = useData();
  const appointments = data.appointments;
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'Vor Ort' as 'Vor Ort' | 'Online',
  });
  const [commentInput, setCommentInput] = useState('');
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  // Termine beim Mount laden
  useEffect(() => {
    fetchAppointmentsFromServer();
  }, [fetchAppointmentsFromServer]);

  // Prefill defaults when opening the add form if fields are empty
  useEffect(() => {
    if (!isAdding) return;

    const pad = (n: number) => String(n).padStart(2, '0');
    const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

    const now = new Date();
    const rounded = new Date(now);
    const mins = now.getMinutes();
    const add = mins % 30 === 0 ? 0 : 30 - (mins % 30);
    rounded.setMinutes(mins + add, 0, 0);

    const start = new Date(rounded);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    setForm((prev) => {
      if (prev.date && prev.startTime && prev.endTime) return prev;
      return {
        ...prev,
        date: prev.date || formatDate(start),
        startTime: prev.startTime || formatTime(start),
        endTime: prev.endTime || formatTime(end),
        type: prev.type || 'Vor Ort',
      };
    });
  }, [isAdding]);

  const resetForm = () => {
    setForm({ title: '', date: '', startTime: '', endTime: '', type: 'Vor Ort' });
    setEditingId(null);
    setIsAdding(false);
    setAddError(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!form.title || !form.date || !form.startTime || !form.endTime || !form.type) return;
    try {
      if (editingId) {
        await updateAppointment(editingId, { ...form });
      } else {
        await addAppointment({ ...form });
      }
      resetForm();
    } catch (err: any) {
      setAddError('Fehler beim Speichern des Termins. Bitte prüfe die Eingaben.');
    }
  };

  const handleEdit = (app: Appointment) => {
    setForm({
      title: app.title,
      date: app.date,
      startTime: app.startTime,
      endTime: app.endTime,
      type: app.type,
    });
    setEditingId(app.id);
    setIsAdding(true);
  };

  const handleAddComment = async (id: string) => {
    if (!commentInput.trim()) return;
    await addAppointmentComment(id, { text: commentInput, timestamp: Date.now(), author: currentUser || 'Unbekannt' });
    setCommentInput('');
  };

  const handleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bist du sicher, dass du diesen Termin löschen möchtest?')) {
      await deleteAppointment(id);
      setExpandedId(null);
    }
  };

  const createICalAndOpen = (app: Appointment) => {
    // iCal Format
    const pad = (n: number) => n < 10 ? '0' + n : n;
    const dt = new Date(app.date + 'T' + app.startTime);
    const dtEnd = new Date(app.date + 'T' + app.endTime);
    const formatDate = (d: Date) =>
      d.getUTCFullYear().toString() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      '00Z';
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `UID:${app.id}@wg-casting-app`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(dt)}`,
      `DTEND:${formatDate(dtEnd)}`,
      `SUMMARY:${app.title}`,
      `DESCRIPTION:Typ: ${app.type}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${app.title}.ics`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header mit Add-Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Termine</h2>
        <button
          className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 touch-manipulation"
          onClick={() => { setIsAdding(true); setEditingId(null); setForm({ title: '', date: '', startTime: '', endTime: '', type: 'Vor Ort' }); }}
        >
          + Termin hinzufügen
        </button>
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4">
          <h3 className="font-medium mb-3">{editingId ? 'Termin bearbeiten' : 'Neuen Termin hinzufügen'}</h3>
          {addError && <div className="text-red-600 text-sm mb-2">{addError}</div>}
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Überschrift *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Name des Kandidaten..."
              />
            </div>
            <div className="flex gap-2">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="w-1/4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start *</label>
                <input
                  type="time"
                  required
                  value={form.startTime}
                  onChange={e => setForm({ ...form, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="w-1/4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Ende *</label>
                <input
                  type="time"
                  required
                  value={form.endTime}
                  onChange={e => setForm({ ...form, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Typ *</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as 'Vor Ort' | 'Online' })}
              >
                <option value="Vor Ort">Vor Ort</option>
                <option value="Online">Online</option>
              </select>
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="bg-primary-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-600 touch-manipulation">Termin {editingId ? 'Bearbeiten' : 'Hinzufügen'}</button>
              <button type="button" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 touch-manipulation" onClick={resetForm}>Abbrechen</button>
            </div>
          </form>
        </div>
      )}

      {/* Terminliste */}
      <div className="space-y-2">
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Noch keine Termine :/</p>
            <p className="text-sm">Drücke "Termin hinzufügen"</p>
          </div>
        ) : (
          appointments.map(app => {
            const isExpanded = expandedId === app.id;
            return (
              <div key={app.id} className="border rounded px-3 py-2 mb-2 flex flex-col bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-semibold cursor-pointer hover:underline"
                      onClick={() => handleExpand(app.id)}
                    >
                      {app.title}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs text-white bg-blue-500">
                      {app.type}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {app.date} {app.startTime} - {app.endTime}
                    </span>
                  </div>
                  <button
                    className="ml-2 text-primary-500 hover:text-primary-700 focus:outline-none w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 border border-blue-200 shadow-sm transition-colors"
                    title="Als iCal speichern"
                    onClick={() => createICalAndOpen(app)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <rect x="4" y="5" width="16" height="15" rx="3" fill="#e0e7ff" stroke="#3b82f6" strokeWidth="1.5"/>
                      <path stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M8 3v4M16 3v4"/>
                      <rect x="8" y="13" width="8" height="2" rx="1" fill="#3b82f6"/>
                    </svg>
                  </button>
                </div>
                {isExpanded && (
                  <div className="mt-2 text-sm text-gray-700">
                    <div className="font-semibold text-sm mb-1">Kommentare:</div>
                    <ul className="mb-2">
                      {(app.comments || []).map((c, idx) => (
                        <li key={idx} className="text-xs text-gray-700">- <span className="font-semibold">{c.author || 'Unbekannt'}</span>: {c.text}</li>
                      ))}
                    </ul>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        className="border px-2 py-1 text-xs w-full rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Kommentar hinzufügen..."
                        value={activeComments === app.id ? commentInput : ''}
                        onFocus={() => setActiveComments(app.id)}
                        onChange={e => setCommentInput(e.target.value)}
                      />
                      <button
                        className="bg-primary-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-primary-600 touch-manipulation"
                        onClick={() => handleAddComment(app.id)}
                        disabled={!commentInput.trim() || activeComments !== app.id}
                      >
                        Hinzufügen
                      </button>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        className="px-2 py-1 text-xs bg-blue-100 rounded hover:bg-blue-200 text-blue-700 border border-blue-200 font-medium"
                        onClick={() => handleEdit(app)}
                      >
                        Bearbeiten
                      </button>
                      <button
                        className="px-2 py-1 text-xs bg-red-100 rounded hover:bg-red-200 text-red-700 border border-red-200 font-medium"
                        onClick={() => handleDelete(app.id)}
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AppointmentList;
