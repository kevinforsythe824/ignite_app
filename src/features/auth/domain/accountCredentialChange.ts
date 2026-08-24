/** Inputs for secure account email change (includes current password for reauth). */
export interface ChangeEmailInput {
  newEmail: string;
  currentPassword: string;
}

/** Inputs for secure account password change (includes current password for reauth). */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
