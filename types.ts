export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Recommendation {
  title: string;
  link: string;
  description: string;
}

export interface AnalysisResult {
  status: string;
  summary: string;
  recommendations: Recommendation[];
}

export enum AppState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LIVE = 'LIVE',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR'
}
