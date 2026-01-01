export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
}

export function generateICSFile(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  };

  const escape = (str: string): string => {
    return str.replace(/[,;\\]/g, (match) => `\\${match}`).replace(/\n/g, '\\n');
  };

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TaxiAssur//Calendar//FR',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@taxiassur.fr`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(event.startTime)}`,
    `DTEND:${formatDate(event.endTime)}`,
    `SUMMARY:${escape(event.title)}`,
  ];

  if (event.description) {
    ics.push(`DESCRIPTION:${escape(event.description)}`);
  }

  if (event.location) {
    ics.push(`LOCATION:${escape(event.location)}`);
  }

  if (event.attendees && event.attendees.length > 0) {
    event.attendees.forEach((email) => {
      ics.push(`ATTENDEE;CN=${email}:mailto:${email}`);
    });
  }

  ics.push('END:VEVENT', 'END:VCALENDAR');

  return ics.join('\r\n');
}

export function downloadICS(event: CalendarEvent, filename: string = 'event.ics') {
  const icsContent = generateICSFile(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function addToGoogleCalendar(event: CalendarEvent): string {
  const formatDateGoogle = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDateGoogle(event.startTime)}/${formatDateGoogle(event.endTime)}`,
  });

  if (event.description) {
    params.append('details', event.description);
  }

  if (event.location) {
    params.append('location', event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function addToOutlookCalendar(event: CalendarEvent): string {
  const formatDateOutlook = (date: Date): string => {
    return date.toISOString();
  };

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: formatDateOutlook(event.startTime),
    enddt: formatDateOutlook(event.endTime),
  });

  if (event.description) {
    params.append('body', event.description);
  }

  if (event.location) {
    params.append('location', event.location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export class CalendarManager {
  async requestCalendarAccess(): Promise<boolean> {
    if (!('CalendarEvent' in window)) {
      return false;
    }
    return true;
  }

  createEvent(event: CalendarEvent) {
    return {
      downloadICS: () => downloadICS(event),
      openGoogleCalendar: () => window.open(addToGoogleCalendar(event), '_blank'),
      openOutlookCalendar: () => window.open(addToOutlookCalendar(event), '_blank'),
      getICSContent: () => generateICSFile(event),
    };
  }

  createAppointment(
    title: string,
    dateTime: Date,
    duration: number = 60,
    description?: string
  ) {
    const endTime = new Date(dateTime.getTime() + duration * 60000);

    return this.createEvent({
      title,
      description,
      startTime: dateTime,
      endTime,
    });
  }
}

export const calendarManager = new CalendarManager();
