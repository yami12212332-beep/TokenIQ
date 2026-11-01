import type { TimePeriodOption } from '../types/dashboard';

export const TIME_PERIOD_OPTIONS: TimePeriodOption[] = [
  // Monthly options
  { type: 'MONTHLY', key: '2026-10', label: 'October 2026 (Current)', startDate: '2026-10-01', endDate: '2026-10-31' },
  { type: 'MONTHLY', key: '2026-09', label: 'September 2026', startDate: '2026-09-01', endDate: '2026-09-30' },
  { type: 'MONTHLY', key: '2026-08', label: 'August 2026', startDate: '2026-08-01', endDate: '2026-08-31' },
  
  // Weekly: the scheduler fetches 7-day reports, so weekly always shows the latest fetched snapshot
  { type: 'WEEKLY', key: 'LATEST_WEEK', label: 'Latest 7-day snapshot', startDate: '', endDate: '' },
];
