import { notConnected } from '../errors';
import type {
  CoachChatRequest,
  CoachChatResponse,
  CoachingSummaryRequest,
  CoachingSummaryResponse,
  DistractorRequest,
  DistractorResponse,
  ErrorDiagnosticRequest,
  ErrorDiagnosticResponse,
  SongGenerationJob,
  SongGenerationRequest,
} from './types';

/**
 * AI integration surface (Vercel AI SDK / Cloud Functions later).
 * Kept separate from generic HTTP so features depend on intent, not transport.
 */
export interface AiGateway {
  generateDistractors(request: DistractorRequest): Promise<DistractorResponse>;
  diagnoseError(request: ErrorDiagnosticRequest): Promise<ErrorDiagnosticResponse>;
  summarizeCoaching(request: CoachingSummaryRequest): Promise<CoachingSummaryResponse>;
  enqueueSongGeneration(request: SongGenerationRequest): Promise<SongGenerationJob>;
  getSongGenerationJob(jobId: string): Promise<SongGenerationJob | null>;
  chatWithCoach(request: CoachChatRequest): Promise<CoachChatResponse>;
}

/** Stub AI gateway — no model calls yet. */
export const aiGateway: AiGateway = {
  generateDistractors: () => notConnected('aiGateway', 'generateDistractors'),
  diagnoseError: () => notConnected('aiGateway', 'diagnoseError'),
  summarizeCoaching: () => notConnected('aiGateway', 'summarizeCoaching'),
  enqueueSongGeneration: () => notConnected('aiGateway', 'enqueueSongGeneration'),
  getSongGenerationJob: () => notConnected('aiGateway', 'getSongGenerationJob'),
  chatWithCoach: () => notConnected('aiGateway', 'chatWithCoach'),
};

export function createAiGateway(): AiGateway {
  return aiGateway;
}
