export { ServiceNotConnectedError, notConnected } from './errors';

export {
  createFirebaseService,
  firebaseService,
  getFirebaseApp,
  getFirebaseFirestore,
  readFirebaseClientConfig,
  FirebaseNotConfiguredError,
  FIREBASE_CLIENT_ENV_KEYS,
} from './firebase';
export type {
  AuthCredentials,
  AuthService,
  AuthStateListener,
  AuthUser,
  FirebaseClientConfig,
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
