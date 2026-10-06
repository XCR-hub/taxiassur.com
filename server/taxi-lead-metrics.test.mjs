import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taxiLeadMetrics, isTaxiWebsiteRequest } from '../shared/taxi-lead-metrics.js';
const row = (id, overrides = {}) => ({ id, source: 'website', vehicle_type: 'Taxi', email: id + '@client.fr', phone: '061234567' + id, city: 'Paris', created_at: '2026-10-06T10:00:00Z', ...overrides });
test('target counts only genuine taxi website requests and deduplicates email and phone', () => {
 const first = row('1'), duplicate = row('2', { email: first.email }), phoneDuplicate = row('3', { phone: first.phone });
 const excluded = [row('4', { vehicle_type: 'VTC' }), row('5', { source: 'email_intake' }), row('6', { is_test: true }), row('7', { deleted_at: '2026-10-06' }), row('8', { phone: '12' }), row('9', { email: 'test@example.com' })];
 const metrics = taxiLeadMetrics([first, duplicate, phoneDuplicate, ...excluded], new Date('2026-10-06T18:00:00Z'));
 assert.equal(metrics.count30Days, 1); assert.equal(metrics.target30Days, 90); assert.equal(metrics.remaining, 89);
 assert.equal(isTaxiWebsiteRequest(row('4', { vehicle_type: 'VTC', service: 'assurance-taxi' })), false);
});
test('dates use Paris calendar days, include zero days, and compare the previous calendar month', () => {
 const now = new Date('2026-10-06T22:30:00Z');
 const metrics = taxiLeadMetrics([row('1', { created_at: '2026-10-06T22:10:00Z' }), row('2', { created_at: '2026-09-20T10:00:00Z' }), row('3', { created_at: '2026-10-08T10:00:00Z' })], now);
 assert.equal(metrics.today, 1); assert.equal(metrics.count30Days, 2); assert.equal(metrics.previousMonth, 1);
 assert.equal(metrics.daily.length, 30); assert.equal(metrics.daily.at(-1).date, '2026-10-07');
 assert.equal(metrics.daily.filter(day => day.leads === 0).length, 28);
});
test('an existing contact resubmitting later does not inflate new lead growth', () => {
 const metrics = taxiLeadMetrics([row('1', { created_at: '2026-08-01T10:00:00Z' }), row('2', { email: '1@client.fr' })], new Date('2026-10-06T18:00:00Z'));
 assert.equal(metrics.count30Days, 0);
});


test('a daylight saving time change does not duplicate or skip a calendar day', () => {
 const metrics = taxiLeadMetrics([], new Date('2026-10-26T23:30:00Z'));
 assert.equal(metrics.daily.length, 30); assert.equal(new Set(metrics.daily.map(day => day.date)).size, 30);
 assert.equal(metrics.daily.at(-1).date, '2026-10-27'); assert.equal(metrics.daily[0].date, '2026-09-28');
});
