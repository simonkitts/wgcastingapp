import React, { useState } from 'react';

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
  const [form, setForm] = useState({
    title: initialTitle,
    date: initialDate,
    startTime: initialStartTime,
    endTime: initialEndTime,
    type: initialType as AppointmentType,
  });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setForm({
      title: initialTitle,
      date: initialDate,
      startTime: initialStartTime,
      endTime: initialEndTime,
      type: initialType as AppointmentType,
    });
  }, [open, initialTitle, initialDate, initialStartTime, initialEndTime, initialType]);

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

