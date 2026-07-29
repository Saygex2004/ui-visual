// Calendar data layer (FRONTEND.md §3). Month view is a plain one-shot query
// (no dedicated poll cadence — badges are current as of the visit, same
// staleness tolerance as any other navigation-triggered fetch); the day view
// polls at POLL_CADENCES_MS.calendarDay while its progress line is on screen.
import { useQuery } from '@tanstack/react-query';
import { POLL_CADENCES_MS } from '@pvp/shared';
import * as calendarApi from './api.js';

export function useMonth(month: string) {
  return useQuery({
    queryKey: ['calendar', 'month', month],
    queryFn: () => calendarApi.fetchMonth(month),
  });
}

export function useDay(date: string) {
  return useQuery({
    queryKey: ['calendar', 'day', date],
    queryFn: () => calendarApi.fetchDay(date),
    refetchInterval: POLL_CADENCES_MS.calendarDay,
  });
}
