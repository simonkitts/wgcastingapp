import React, { useState, useCallback } from 'react';

export type AppointmentType = 'Vor Ort' | 'Online';

interface AppointmentModalProps {
  open: boolean;
  initialTitle?: string;
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  initialType?: AppointmentType;
  onSave: (data: { title: string; date: string; startTime: string; endTime: string; type: AppointmentType }) => Promise<void>;
  onCancel: () => void;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  open,
  initialTitle = '',
  initialDate = '',
  initialStartTime = '',
  initialEndTime = '',
  initialType = 'Vor Ort',
  onSave,
  onCancel,
}) => {
  const [saving, setSaving] = useState(false);

  const computeDefaults = useCallback(() => {
    // Helper formatting kept inside to avoid extra dependencies
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

    let date = initialDate;
    let startTime = initialStartTime;
    let endTime = initialEndTime;

    if (!date || !startTime || !endTime) {
      const now = new Date();
      const rounded = new Date(now);
      const mins = now.getMinutes();
      const add = mins % 30 === 0 ? 0 : 30 - (mins % 30); // next 30-min slot
      rounded.setMinutes(mins + add, 0, 0);

      const start = new Date(rounded);
      const end = new Date(start.getTime() + 30 * 60 * 1000);

      date = date || formatDate(start);
      startTime = startTime || formatTime(start);
      endTime = endTime || formatTime(end);
    }

    return {
      title: initialTitle,
      date,
      startTime,
      endTime,
      type: (initialType as AppointmentType) || 'Vor Ort',
    };
  }, [initialDate, initialEndTime, initialStartTime, initialTitle, initialType]);

  const [form, setForm] = useState(computeDefaults);

  React.useEffect(() => {
    setForm(computeDefaults());
  }, [open, computeDefaults]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h3 className="font-medium mb-3">Neuen Termin hinzufügen</h3>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            await onSave(form);
            setSaving(false);
          }}
          className="space-y-3"
        >
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
              onChange={e => setForm({ ...form, type: e.target.value as AppointmentType })}
            >
              <option value="Vor Ort">Vor Ort</option>
              <option value="Online">Online</option>
            </select>
          </div>
          <div className="flex space-x-3">
            <button type="submit" disabled={saving} className="bg-primary-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-600 touch-manipulation">
              {saving ? 'Speichern...' : 'Termin Hinzufügen'}
            </button>
            <button type="button" disabled={saving} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 touch-manipulation" onClick={onCancel}>Abbrechen</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentModal;
