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
  DatabaseService,
  DeckProgress,
  FirebaseService,
  RemoteDeck,
  RemoteMatchedRule,
  RemoteVerse,
  Unsubscribe,
} from './firebase';

export {
  createStorageService,
  storageService,
} from './storage';
export type {
  OfflineSettings,
  StorageKey,
  StorageService,
  StoredDeckBundle,
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
