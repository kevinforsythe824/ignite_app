export const CONSENT_SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'self'; img-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'none'",
};

export function applySecurityHeaders(res: {
  setHeader: (name: string, value: string) => void;
}): void {
  for (const [key, value] of Object.entries(CONSENT_SECURITY_HEADERS)) {
    res.setHeader(key, value);
  }
}
