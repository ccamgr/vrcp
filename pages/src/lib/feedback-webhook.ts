import { decodeFeedbackWebhookUrl } from '../generated/feedback-webhook-config';
import type { DiscordFeedbackPayload } from './feedback-payload';

const REQUEST_TIMEOUT_MS = 15_000;

export function feedbackSendingEnabled(): boolean {
  return decodeFeedbackWebhookUrl() !== undefined;
}

export async function sendFeedback(payload: DiscordFeedbackPayload): Promise<void> {
  const webhookUrl = decodeFeedbackWebhookUrl();
  if (!webhookUrl) throw new Error('Feedback delivery is not configured.');

  const url = new URL(webhookUrl);
  url.searchParams.set('wait', 'true');

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Feedback delivery failed with status ${response.status}.`);
  } finally {
    window.clearTimeout(timeout);
  }
}
