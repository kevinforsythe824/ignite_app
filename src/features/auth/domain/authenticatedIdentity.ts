/** Authentication-level identity owned by Firebase Auth — not the Quizzer profile. */
export interface AuthenticatedIdentity {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}
