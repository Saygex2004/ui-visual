// Calendar API calls (API_CONTRACT.md §7) — always "my calendar", no user param.
import { api } from '../../lib/apiClient.js';
import type { MonthResponse, DayResponse } from '@pvp/shared';

export function fetchMonth(month: string): Promise<MonthResponse> {
  return api.get<MonthResponse>(`/calendar/${month}`);
}

export function fetchDay(date: string): Promise<DayResponse> {
  return api.get<DayResponse>(`/calendar/day/${date}`);
}
