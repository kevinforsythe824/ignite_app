/**
 * Mask parent email for safe client responses.
 * Never log or return the full address from this helper's callers' logs.
 */
export function maskParentEmail(canonicalEmail: string): string {
  const at = canonicalEmail.indexOf('@');
  if (at <= 0) {
    return '***';
  }
  const local = canonicalEmail.slice(0, at);
  const domain = canonicalEmail.slice(at + 1);
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}
