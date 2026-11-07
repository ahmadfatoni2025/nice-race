import { MAX_DISPLAY_NAME, MIN_DISPLAY_NAME } from '@horizon/shared';

/** Strip markup/control characters and normalize a player display name. */
export function sanitizeDisplayName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const cleaned = raw
    .normalize('NFKC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/[<>&"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DISPLAY_NAME);
  return cleaned;
}

export function isValidDisplayName(name: string): boolean {
  return name.length >= MIN_DISPLAY_NAME && name.length <= MAX_DISPLAY_NAME;
}

/** Ensure unique names within a room by suffixing a counter. */
export function uniqueDisplayName(base: string, taken: Iterable<string>): string {
  const names = new Set([...taken].map((name) => name.toLowerCase()));
  if (!names.has(base.toLowerCase())) return base;
  for (let i = 2; i < 100; i++) {
    const suffix = ` ${i}`;
    const candidate = `${base.slice(0, MAX_DISPLAY_NAME - suffix.length)}${suffix}`;
    if (!names.has(candidate.toLowerCase())) return candidate;
  }
  return base;
}

export function sanitizeRoomId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{5}$/.test(value)) return null;
  return value;
}
