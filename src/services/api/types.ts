/** Shared request metadata for serverless / AI gateway calls. */
export interface ApiRequestContext {
  userId?: string;
  sessionId?: string;
}

export type ChartingFocus =
  | 'verseBeginning'
  | 'verseEnding'
  | 'questions'
  | 'exclamations'
  | 'keywords';

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

/** Module D — AI distractor generation. */
export interface DistractorRequest extends ApiRequestContext {
  reference: string;
  verseText: string;
  focus: ChartingFocus;
  difficulty: QuizDifficulty;
  count: number;
}

export interface DistractorResponse {
  options: readonly string[];
  correctIndex: number;
}

/** Module D — one-line error diagnostics. */
export interface ErrorDiagnosticRequest extends ApiRequestContext {
  reference: string;
  verseText: string;
  userAnswer: string;
  correctAnswer: string;
  focus: ChartingFocus;
}

export interface ErrorDiagnosticResponse {
  coachingNote: string;
}

/** Module E — micro-coaching summary. */
export interface CoachingSummaryRequest extends ApiRequestContext {
  studyTimeHours: number;
  versesLearned: number;
  focusScore: number;
  recentMisses: readonly string[];
}

export interface CoachingSummaryResponse {
  summary: string;
  recommendations: readonly string[];
}

/** Module G — mnemonic song generation job. */
export interface SongGenerationRequest extends ApiRequestContext {
  reference: string;
  verseText: string;
}

export interface SongGenerationJob {
  jobId: string;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  audioUrl: string | null;
  errorMessage: string | null;
}

/** Module G — freeform AI coach chat. */
export interface CoachChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CoachChatRequest extends ApiRequestContext {
  messages: readonly CoachChatMessage[];
}

export interface CoachChatResponse {
  reply: string;
}
