export interface SessionInfo {
  londonSession: boolean;
  nySession: boolean;
  asianSession: boolean;
  sessionOverlap: boolean;
  volatility: number; // 0-1
}

export type SessionType = 'london' | 'new_york' | 'asian' | 'sydney' | 'overlap';

export interface SessionConfig {
  sessions: SessionType[];
  timezone: string;
  enableVolatilityTracking: boolean;
}