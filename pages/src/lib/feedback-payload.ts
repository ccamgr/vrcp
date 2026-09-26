import type { FeedbackContext, FeedbackFormInput } from './feedback-contract';

interface DiscordField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordFeedbackPayload {
  allowed_mentions: { parse: [] };
  embeds: Array<{
    title: string;
    description: string;
    color: number;
    timestamp: string;
    fields: DiscordField[];
  }>;
}

function joinValues(values: Array<string | number | undefined>): string | undefined {
  const present = values.filter((value): value is string | number => value !== undefined && value !== '');
  return present.length > 0 ? present.join('\n') : undefined;
}

function addField(fields: DiscordField[], name: string, value: string | undefined): void {
  if (value) fields.push({ name, value, inline: false });
}

export function createDiscordFeedbackPayload(
  input: FeedbackFormInput,
  context: FeedbackContext,
): DiscordFeedbackPayload {
  const fields: DiscordField[] = [];

  addField(fields, 'Reply email', input.email || undefined);
  addField(fields, 'Application', joinValues([context.app, context.version, context.channel]));
  addField(fields, 'Platform', joinValues([context.platform, context.locale, context.timeZone]));
  addField(fields, 'Occurred', joinValues([context.occurredAt, context.screen]));
  addField(fields, 'Compatibility', context.schemaVersion === undefined ? undefined : String(context.schemaVersion));
  addField(fields, 'Error', joinValues([context.errorCode, context.errorFingerprint, context.error]));

  return {
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: 'VRCP feedback',
        description: input.message,
        color: 0x5865f2,
        timestamp: new Date().toISOString(),
        fields,
      },
    ],
  };
}
