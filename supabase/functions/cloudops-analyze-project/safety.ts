export class AnalysisError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function sanitizeText(text: string) {
  return text.replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, '[REDACTADO: clave privada]')
    .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, '[REDACTADO]')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[A-Za-z0-9_-]{30,}|sk-[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]+)\b/g, '[REDACTADO]')
    .replace(/((?:password|passwd|secret|api[_-]?key|access[_-]?token|service[_-]?role[_-]?key)\s*["']?\s*[:=]\s*)[^\r\n,;]+/gi, '$1[REDACTADO]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTADO]')
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[REDACTADO]@').trim();
}
