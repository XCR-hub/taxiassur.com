import { useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Users, Plus, X, Video, Phone } from 'lucide-react';
import { Calendar, CalendarEvent } from '../components/Calendar';

const generateEvents = (): CalendarEvent[] => {
  const today = new Date();

  return [
    {
      id: '1',
      title: 'Rdv client Paris',
      description: 'Rencontre avec Jean Dupont pour assurance taxi',
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
      type: 'meeting',
      location: 'Paris 15ème',
      attendees: ['Jean Dupont', 'Marie']
    },
    {
      id: '2',
      title: 'Appel prospect Lyon',
      description: 'Suivi devis flotte véhicules',
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 30),
      type: 'call',
      attendees: ['Sophie Martin']
    },
    {
      id: '3',
      title: 'Visio équipe',
      description: 'Point hebdomadaire équipe commerciale',
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0),
      type: 'meeting',
      location: 'Zoom',
      attendees: ['Marie', 'Pierre', 'Thomas']
    },
    {
      id: '4',
      title: 'Relance devis Bordeaux',
      description: 'Contacter Claire Rousseau',
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 30),
      type: 'task',
      attendees: ['Thomas']
    },
    {
      id: '5',
      title: 'Formation nouveaux produits',
      description: 'Formation sur les nouvelles garanties 2025',
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 9, 0),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 12, 0),
      type: 'meeting',
      location: 'Salle de formation',
      attendees: ['Toute l\'équipe']
    },
    {
      id: '6',
      title: 'Rendez-vous Marseille',
      description: 'Alexandre Petit - Contrat VTC',
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 11, 0),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 12, 0),
      type: 'meeting',
      location: 'Marseille 8ème',
      attendees: ['Alexandre Petit', 'Marie']
    },
    {
      id: '7',
      title: 'Rappel renouvellement',
      description: 'Contrats arrivant à échéance',
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 9, 0),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 9, 15),
      type: 'reminder',
      attendees: ['Pierre']
    },
    {
      id: '8',
      title: 'Signature contrat Toulouse',
      description: 'Nicolas Simon - Flotte 3 véhicules',
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 15, 0),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 16, 0),
      type: 'meeting',
      location: 'Bureau Toulouse',
      attendees: ['Nicolas Simon', 'Thomas']
    },
    {
      id: '9',
      title: 'Appel client satisfait',
      description: 'Thomas Moreau - Feedback après 1 mois',
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 14, 0),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 14, 30),
      type: 'call',
      attendees: ['Thomas Moreau', 'Pierre']
    },
    {
      id: '10',
      title: 'Réunion partenaires',
      description: 'Point trimestriel avec assureurs',
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5, 10, 0),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5, 12, 0),
      type: 'meeting',
      location: 'Siège Paris',
      attendees: ['Direction', 'Partenaires']
    },
    {
      id: '11',
      title: 'Formation CRM',
      description: 'Nouvelles fonctionnalités CRM',
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 14, 0),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 16, 0),
      type: 'meeting',
      location: 'En ligne',
      attendees: ['Équipe commerciale']
    },
    {
      id: '12',
      title: 'Démo assurance jeune',
      description: 'Présentation nouvelle offre jeunes conducteurs',
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12, 11, 0),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12, 12, 30),
      type: 'meeting',
      location: 'Visio',
      attendees: ['Prospects', 'Marie']
    }
  ];
};

export default function CalendarDemo() {
  const [events, setEvents] = useState<CalendarEvent[]>(generateEvents());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleAddEvent = () => {
    setShowAddEvent(true);
  };

  const stats = {
    total: events.length,
    meetings: events.filter(e => e.type === 'meeting').length,
    calls: events.filter(e => e.type === 'call').length,
    tasks: events.filter(e => e.type === 'task').length,
    reminders: events.filter(e => e.type === 'reminder').length
  };

  const upcomingEvents = events
    .filter(e => new Date(e.start) > new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);

  const getEventIcon = (type?: string) => {
    switch (type) {
      case 'meeting': return Video;
      case 'call': return Phone;
      case 'task': return Clock;
      case 'reminder': return CalendarIcon;
      default: return CalendarIcon;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <CalendarIcon className="w-10 h-10 text-blue-500" />
                Calendrier & Planning
              </h1>
              <p className="text-gray-400 text-lg">
                Gérez vos rendez-vous, appels et tâches
              </p>
            </div>
            <button
              onClick={handleAddEvent}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nouvel événement
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm mb-1">Total Événements</div>
                <div className="text-3xl font-bold text-white">{stats.total}</div>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm mb-1">Réunions</div>
                <div className="text-3xl font-bold text-blue-500">{stats.meetings}</div>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Video className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm mb-1">Appels</div>
                <div className="text-3xl font-bold text-green-500">{stats.calls}</div>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm mb-1">Tâches</div>
                <div className="text-3xl font-bold text-purple-500">{stats.tasks}</div>
              </div>
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm mb-1">Rappels</div>
                <div className="text-3xl font-bold text-yellow-500">{stats.reminders}</div>
              </div>
              <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Calendar
              events={events}
              view={view}
              onViewChange={setView}
              onEventClick={handleEventClick}
              onDateClick={handleDateClick}
            />
          </div>

          <div className="space-y-6">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Événements à venir
              </h3>
              <div className="space-y-3">
                {upcomingEvents.map(event => {
                  const Icon = getEventIcon(event.type);
                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="bg-gray-950 rounded-lg p-4 border border-gray-800 hover:border-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`
                          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                          ${event.type === 'meeting' ? 'bg-blue-500/10' : ''}
                          ${event.type === 'call' ? 'bg-green-500/10' : ''}
                          ${event.type === 'task' ? 'bg-purple-500/10' : ''}
                          ${event.type === 'reminder' ? 'bg-yellow-500/10' : ''}
                        `}>
                          <Icon className={`
                            w-5 h-5
                            ${event.type === 'meeting' ? 'text-blue-500' : ''}
                            ${event.type === 'call' ? 'text-green-500' : ''}
                            ${event.type === 'task' ? 'text-purple-500' : ''}
                            ${event.type === 'reminder' ? 'text-yellow-500' : ''}
                          `} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white mb-1 truncate">
                            {event.title}
                          </div>
                          <div className="text-sm text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(event.start).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short'
                            })} à {new Date(event.start).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Légende</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-500 rounded" />
                  <span className="text-gray-300 text-sm">Réunions</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <span className="text-gray-300 text-sm">Appels</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-purple-500 rounded" />
                  <span className="text-gray-300 text-sm">Tâches</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-yellow-500 rounded" />
                  <span className="text-gray-300 text-sm">Rappels</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedEvent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">{selectedEvent.title}</h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {selectedEvent.description && (
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Description</div>
                    <div className="text-white">{selectedEvent.description}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Début
                    </div>
                    <div className="text-white">
                      {new Date(selectedEvent.start).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Fin
                    </div>
                    <div className="text-white">
                      {new Date(selectedEvent.end).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>

                {selectedEvent.location && (
                  <div>
                    <div className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      Lieu
                    </div>
                    <div className="text-white">{selectedEvent.location}</div>
                  </div>
                )}

                {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                  <div>
                    <div className="text-gray-400 text-sm mb-2 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Participants
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {selectedEvent.attendees.map((attendee, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300"
                        >
                          {attendee}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors">
                    Modifier
                  </button>
                  <button className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors">
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
