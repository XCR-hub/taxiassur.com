import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Clock, MapPin, User } from 'lucide-react';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  color?: string;
  location?: string;
  attendees?: string[];
  type?: 'meeting' | 'call' | 'task' | 'reminder';
}

interface CalendarProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  onEventAdd?: (date: Date) => void;
  view?: 'month' | 'week' | 'day';
  onViewChange?: (view: 'month' | 'week' | 'day') => void;
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function Calendar({
  events,
  onEventClick,
  onDateClick,
  onEventAdd,
  view = 'month',
  onViewChange
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const startOfMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }, [currentDate]);

  const endOfMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  }, [currentDate]);

  const startOfCalendar = useMemo(() => {
    const start = new Date(startOfMonth);
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start.setDate(start.getDate() - diff);
    return start;
  }, [startOfMonth]);

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const current = new Date(startOfCalendar);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [startOfCalendar]);

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  const handlePrevious = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    } else if (view === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 1);
      setCurrentDate(newDate);
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    } else if (view === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 1);
      setCurrentDate(newDate);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateClick?.(date);
  };

  const getEventColor = (event: CalendarEvent): string => {
    if (event.color) return event.color;

    switch (event.type) {
      case 'meeting': return 'bg-blue-500';
      case 'call': return 'bg-green-500';
      case 'task': return 'bg-purple-500';
      case 'reminder': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={handleToday}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Aujourd'hui
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
              {(['month', 'week', 'day'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => onViewChange?.(v)}
                  className={`
                    px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize
                    ${view === v
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }
                  `}
                >
                  {v === 'month' ? 'Mois' : v === 'week' ? 'Semaine' : 'Jour'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={handlePrevious}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
              <button
                onClick={handleNext}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {view === 'month' && (
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>
        )}
      </div>

      {view === 'month' && (
        <div className="p-6">
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              const dayEvents = getEventsForDate(day);
              const isTodayDate = isToday(day);
              const isCurrentMonthDate = isCurrentMonth(day);

              return (
                <div
                  key={index}
                  onClick={() => handleDateClick(day)}
                  className={`
                    min-h-[100px] rounded-lg border transition-all cursor-pointer
                    ${isTodayDate
                      ? 'border-blue-500 bg-blue-500/5'
                      : 'border-gray-800 hover:border-gray-700'
                    }
                    ${!isCurrentMonthDate ? 'opacity-40' : ''}
                  `}
                >
                  <div className="p-2">
                    <div className={`
                      text-sm font-semibold mb-1
                      ${isTodayDate ? 'text-blue-500' : 'text-gray-400'}
                    `}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                          className={`
                            ${getEventColor(event)} text-white text-xs px-2 py-1 rounded
                            truncate font-medium hover:opacity-80 transition-opacity
                          `}
                        >
                          {formatTime(event.start)} {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-gray-500 px-2">
                          +{dayEvents.length - 2} autre{dayEvents.length - 2 > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'week' && (
        <div className="p-6">
          <div className="grid grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, i) => {
              const day = new Date(currentDate);
              const dayOfWeek = day.getDay();
              const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              day.setDate(day.getDate() - diff + i);

              const dayEvents = getEventsForDate(day);
              const isTodayDate = isToday(day);

              return (
                <div key={i} className="space-y-2">
                  <div className={`
                    text-center pb-2 border-b
                    ${isTodayDate ? 'border-blue-500' : 'border-gray-800'}
                  `}>
                    <div className="text-xs text-gray-500 mb-1">
                      {DAYS[i]}
                    </div>
                    <div className={`
                      text-lg font-bold
                      ${isTodayDate ? 'text-blue-500' : 'text-white'}
                    `}>
                      {day.getDate()}
                    </div>
                  </div>
                  <div className="space-y-2 min-h-[400px]">
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className={`
                          ${getEventColor(event)} text-white p-3 rounded-lg
                          cursor-pointer hover:opacity-80 transition-opacity
                        `}
                      >
                        <div className="font-semibold text-sm mb-1">{event.title}</div>
                        <div className="text-xs opacity-90">
                          {formatTime(event.start)} - {formatTime(event.end)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'day' && (
        <div className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 24 }).map((_, hour) => {
              const hourEvents = events.filter(event => {
                const eventDate = new Date(event.start);
                return (
                  eventDate.getDate() === currentDate.getDate() &&
                  eventDate.getMonth() === currentDate.getMonth() &&
                  eventDate.getFullYear() === currentDate.getFullYear() &&
                  eventDate.getHours() === hour
                );
              });

              return (
                <div key={hour} className="flex gap-4 min-h-[60px]">
                  <div className="w-20 text-right text-sm text-gray-500 pt-1">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div className="flex-1 border-l border-gray-800 pl-4 space-y-2">
                    {hourEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className={`
                          ${getEventColor(event)} text-white p-3 rounded-lg
                          cursor-pointer hover:opacity-80 transition-opacity
                        `}
                      >
                        <div className="font-semibold mb-1">{event.title}</div>
                        <div className="text-sm opacity-90">
                          {formatTime(event.start)} - {formatTime(event.end)}
                        </div>
                        {event.location && (
                          <div className="text-xs opacity-80 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
