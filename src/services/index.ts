export { ServiceNotConnectedError, notConnected } from './errors';

export {
  createFirebaseService,
  firebaseService,
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseFirestore,
  readFirebaseClientConfig,
  FirebaseNotConfiguredError,
  FIREBASE_CLIENT_ENV_KEYS,
  IGNITE_ENV_KEY,
  IGNITE_FIREBASE_PROJECTS,
  FirebaseEnvironmentError,
  readIgniteEnvironment,
} from './firebase';
export type {
  FirebaseClientConfig,
  FirebaseService,
  IgniteEnvironmentName,
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
