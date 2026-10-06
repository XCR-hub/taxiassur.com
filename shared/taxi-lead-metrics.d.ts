export interface TaxiLeadMetrics { targetPerDay: number; target30Days: number; count30Days: number; averagePerDay: number; remaining: number; today: number; previousMonth: number; daysAtTarget: number; daily: Array<{ date: string; leads: number }>; landingPages: Array<{ page: string; leads: number }>; }
export function isTaxiWebsiteRequest(lead: Record<string, unknown>): boolean;
export function taxiLeadMetrics(leads: Array<Record<string, unknown>>, now?: Date): TaxiLeadMetrics;
