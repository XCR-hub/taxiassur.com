const dayKey = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
const emailKey = value => String(value || '').trim().toLowerCase();
const phoneKey = value => String(value || '').replace(/\D/g, '').replace(/^0033/, '33').replace(/^33/, '0');

export function isTaxiWebsiteRequest(lead) {
  if (lead.deleted_at || lead.merged_into || lead.is_archived === true || Number(lead.spam_score || 0) >= 50 || lead.is_test === true || lead.metadata?.is_test === true) return false;
  if (['spam', 'anonymized', 'archived'].includes(String(lead.status || '').toLowerCase())) return false;
  const source = String(lead.source || '').toLowerCase();
  if (!/^(website(?:_form)?|web|site_web|formulaire)$/.test(source)) return false;
  const vehicle = String(lead.vehicle_type || lead.metadata?.vehicle_type || lead.activity_type || '').toLowerCase();
  if (vehicle && !['taxi', 'artisan taxi'].includes(vehicle)) return false;
  if (!vehicle && String(lead.service || '').toLowerCase() !== 'assurance-taxi' && String(lead.status || '').toLowerCase() !== 'taxi') return false;
  const email = emailKey(lead.email), phone = phoneKey(lead.phone);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^0[1-9]\d{8}$/.test(phone)) return false;
  if (/@(?:example\.(?:com|org|net)|[^@]*\.invalid)$/i.test(email) || /^test(?:[+._-]|@)/i.test(email)) return false;
  return Number.isFinite(Date.parse(lead.created_at));
}

export function taxiLeadMetrics(leads, now = new Date()) {
  const today = dayKey(now);
  const calendarDay = new Date(today + 'T12:00:00Z');
  const calendarOffset = offset => new Date(calendarDay.getTime() - offset * 86400000).toISOString().slice(0, 10);
  const start = calendarOffset(29);
  const todayParts = today.split('-').map(Number);
  const previousMonthStart = new Date(Date.UTC(todayParts[0], todayParts[1] - 2, 1)).toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';
  const seenEmails = new Set(), seenPhones = new Set(), unique = [];
  for (const lead of [...leads].filter(isTaxiWebsiteRequest).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))) {
    if (Date.parse(lead.created_at) > now.getTime()) continue;
    const email = emailKey(lead.email), phone = phoneKey(lead.phone);
    if (seenEmails.has(email) || seenPhones.has(phone)) { seenEmails.add(email); seenPhones.add(phone); continue; }
    seenEmails.add(email); seenPhones.add(phone); unique.push(lead);
  }
  const recent = unique.filter(lead => { const date = dayKey(lead.created_at); return date >= start && date <= today; });
  const daily = new Map();
  for (let offset = 29; offset >= 0; offset--) daily.set(calendarOffset(offset), 0);
  const landingPages = new Map();
  for (const lead of recent) {
    const date = dayKey(lead.created_at); daily.set(date, (daily.get(date) || 0) + 1);
    const page = String(lead.acquisition?.landing_page || 'Non attribuée');
    landingPages.set(page, (landingPages.get(page) || 0) + 1);
  }
  return { targetPerDay: 3, target30Days: 90, count30Days: recent.length, averagePerDay: recent.length / 30, remaining: Math.max(0, 90 - recent.length), today: daily.get(today) || 0,
    previousMonth: unique.filter(lead => { const date = dayKey(lead.created_at); return date >= previousMonthStart && date < monthStart; }).length,
    daysAtTarget: [...daily.values()].filter(count => count >= 3).length,
    daily: [...daily].map(([date, leads]) => ({ date, leads })),
    landingPages: [...landingPages].map(([page, leads]) => ({ page, leads })).sort((a, b) => b.leads - a.leads).slice(0, 8),
  };
}
