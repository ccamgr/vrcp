export type FeedbackApp = 'desktop' | 'mobile' | 'web';
export type FeedbackChannel = 'production' | 'preview' | 'development';

export interface FeedbackContext {
  app?: FeedbackApp;
  version?: string;
  platform?: string;
  channel?: FeedbackChannel;
  occurredAt?: string;
  screen?: string;
  locale?: string;
  timeZone?: string;
  schemaVersion?: number;
  errorCode?: string;
  errorFingerprint?: string;
  error?: string;
}

export interface FeedbackFormInput {
  email: string;
  message: string;
}

const MAX_QUERY_LENGTH = 2048;
const MAX_ERROR_LENGTH = 800;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIMPLE_TEXT_PATTERN = /^[\p{L}\p{N} ._:/+()-]+$/u;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const TIME_ZONE_PATTERN = /^[A-Za-z_+-]+(?:\/[A-Za-z_+-]+)*$/;

function readSimpleText(value: string | null, maxLength: number): string | undefined {
  if (!value) return undefined;

  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength && SIMPLE_TEXT_PATTERN.test(normalized)
    ? normalized
    : undefined;
}

function readIdentifier(value: string | null, maxLength: number): string | undefined {
  if (!value) return undefined;

  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength && IDENTIFIER_PATTERN.test(normalized)
    ? normalized
    : undefined;
}

function readOccurredAt(value: string | null): string | undefined {
  if (!value || value.length > 128) return undefined;

  const timestamp = /^\d{1,13}$/.test(value) ? Number(value) : Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

export function parseFeedbackContext(search: string): FeedbackContext {
  if (search.length > MAX_QUERY_LENGTH) return {};

  const query = new URLSearchParams(search);
  const app = query.get('app');
  const channel = query.get('channel');
  const schemaVersion = query.get('schemaVersion');
  const timeZone = query.get('timeZone')?.trim();
  const error = query.get('error')?.trim();

  return {
    app: app === 'desktop' || app === 'mobile' || app === 'web' ? app : undefined,
    version: readSimpleText(query.get('version'), 128),
    platform: readSimpleText(query.get('platform'), 128),
    channel: channel === 'production' || channel === 'preview' || channel === 'development' ? channel : undefined,
    occurredAt: readOccurredAt(query.get('occurredAt')),
    screen: readIdentifier(query.get('screen'), 128),
    locale: readSimpleText(query.get('locale'), 35),
    timeZone: timeZone && timeZone.length <= 64 && TIME_ZONE_PATTERN.test(timeZone) ? timeZone : undefined,
    schemaVersion:
      schemaVersion && /^\d+$/.test(schemaVersion) && Number.isSafeInteger(Number(schemaVersion))
        ? Number(schemaVersion)
        : undefined,
    errorCode: readIdentifier(query.get('errorCode'), 128),
    errorFingerprint: readIdentifier(query.get('errorFingerprint'), 128),
    error: error && error.length <= MAX_ERROR_LENGTH ? error.replace(/\s+/g, ' ') : undefined,
  };
}

export function validateFeedbackForm(input: FeedbackFormInput): FeedbackFormInput | undefined {
  const email = input.email.trim();
  const message = input.message.trim();

  if (message.length === 0 || message.length > 2000) return undefined;
  if (email.length > 254 || (email.length > 0 && !EMAIL_PATTERN.test(email))) return undefined;

  return { email, message };
}
