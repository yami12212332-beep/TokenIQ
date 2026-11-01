/**
 * Overall-tab API helpers. Kept separate from ApiService so the ChatGPT tab work doesn't conflict with it.
 *
 * Delegates to `ApiService.getOverallChatGPTUsers`, which serves
 * `src/data/demoData.json` in demo mode and `/api/overall/chatgpt-users` when
 * `VITE_USE_DUMMY_DATA=false`.
 */
import type { TimeGrain } from '../types/dashboard';
import { ApiService } from './api';
import type { OverallChatGPTResponse } from './api';

export type { OverallChatGPTResponse };
export type OverallChatGPTRow = OverallChatGPTResponse['rows'][number];

export const getOverallChatGPTUsers = (
  periodType: TimeGrain,
  periodKey: string,
): Promise<OverallChatGPTResponse> =>
  ApiService.getOverallChatGPTUsers(periodType, periodKey);
