export { ServiceNotConnectedError, notConnected } from './errors';

export {
  createFirebaseService,
  firebaseService,
} from './firebase';
export type {
  AuthCredentials,
  AuthService,
  AuthStateListener,
  AuthUser,
  FirebaseService,
  Unsubscribe,
} from './firebase';

export {
  createStorageService,
  storageService,
} from './storage';
export type {
  StorageKey,
  StorageService,
} from './storage';

export {
  createAiGateway,
  createApiService,
  aiGateway,
  apiService,
} from './api';
export type {
  AiGateway,
  ApiRequestContext,
  ApiService,
  ChartingFocus,
  CoachChatMessage,
  CoachChatRequest,
  CoachChatResponse,
  CoachingSummaryRequest,
  CoachingSummaryResponse,
  DistractorRequest,
  DistractorResponse,
  ErrorDiagnosticRequest,
  ErrorDiagnosticResponse,
  QuizDifficulty,
  SongGenerationJob,
  SongGenerationRequest,
} from './api';
