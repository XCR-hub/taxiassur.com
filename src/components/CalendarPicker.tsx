import { Calendar, Clock } from 'lucide-react';
import { useState } from 'react';
import { calendarManager, CalendarEvent } from '../lib/calendar-integration';

interface CalendarPickerProps {
  onSelectDateTime: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

export function CalendarPicker({
  onSelectDateTime,
  minDate = new Date(),
  maxDate,
}: CalendarPickerProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  const handleSubmit = () => {
    if (selectedDate && selectedTime) {
      const dateTime = new Date(`${selectedDate}T${selectedTime}`);
      onSelectDateTime(dateTime);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Calendar className="h-4 w-4" />
          Date
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min={formatDate(minDate)}
          max={maxDate ? formatDate(maxDate) : undefined}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Clock className="h-4 w-4" />
          Heure
        </label>
        <input
          type="time"
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!selectedDate || !selectedTime}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
      >
        Confirmer le rendez-vous
      </button>
    </div>
  );
}

export function AddToCalendarButton({ event }: { event: CalendarEvent }) {
  const [showOptions, setShowOptions] = useState(false);
  const calendar = calendarManager.createEvent(event);

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        <Calendar className="h-4 w-4" />
        Ajouter au calendrier
      </button>

      {showOptions && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowOptions(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg bg-white p-2 shadow-xl dark:bg-gray-800">
            <button
              onClick={() => {
                calendar.openGoogleCalendar();
                setShowOptions(false);
              }}
              className="w-full rounded-lg px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Google Calendar
            </button>
            <button
              onClick={() => {
                calendar.openOutlookCalendar();
                setShowOptions(false);
              }}
              className="w-full rounded-lg px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Outlook Calendar
            </button>
            <button
              onClick={() => {
                calendar.downloadICS();
                setShowOptions(false);
              }}
              className="w-full rounded-lg px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Télécharger (ICS)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
