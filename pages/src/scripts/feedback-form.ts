import { parseFeedbackContext, validateFeedbackForm, type FeedbackContext } from '../lib/feedback-contract';
import { createDiscordFeedbackPayload } from '../lib/feedback-payload';
import { feedbackSendingEnabled, sendFeedback } from '../lib/feedback-webhook';

const contextLabels: Record<string, string> = {
  app: 'アプリケーション',
  version: 'バージョン',
  channel: '配布チャネル',
  platform: 'プラットフォーム',
  locale: 'ロケール',
  timeZone: 'タイムゾーン',
  occurredAt: '発生日時',
  screen: '発生画面',
  schemaVersion: 'スキーマバージョン',
  errorCode: 'エラーコード',
  errorFingerprint: 'エラー識別子',
  error: 'エラー概要',
};

function setStatus(element: HTMLElement, message: string, kind: 'error' | 'success' | 'info'): void {
  element.textContent = message;
  element.dataset.kind = kind;
}

function renderContext(context: FeedbackContext, container: HTMLDListElement): void {
  for (const [key, label] of Object.entries(contextLabels)) {
    const value = context[key as keyof FeedbackContext];
    if (value === undefined) continue;

    const term = document.createElement('dt');
    term.textContent = label;
    const definition = document.createElement('dd');
    definition.textContent = String(value);
    container.append(term, definition);
  }

  container.hidden = container.childElementCount === 0;
}

const form = document.querySelector<HTMLFormElement>('[data-feedback-form]');
const email = document.querySelector<HTMLInputElement>('#feedback-email');
const message = document.querySelector<HTMLTextAreaElement>('#feedback-message');
const submit = document.querySelector<HTMLButtonElement>('#feedback-submit');
const status = document.querySelector<HTMLElement>('[data-feedback-status]');
const contextContainer = document.querySelector<HTMLDListElement>('[data-feedback-context]');

if (!form || !email || !message || !submit || !status || !contextContainer) {
  throw new Error('Feedback form elements are missing.');
}

const context = parseFeedbackContext(window.location.search);
renderContext(context, contextContainer);

if (!feedbackSendingEnabled()) {
  submit.disabled = true;
  setStatus(status, 'この環境ではフィードバック送信が設定されていません。', 'info');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const input = validateFeedbackForm({ email: email.value, message: message.value });
  if (!input) {
    setStatus(status, '有効なメールアドレスを入力するか空欄にし、2,000文字以内で本文を入力してください。', 'error');
    return;
  }

  submit.disabled = true;
  email.disabled = true;
  message.disabled = true;
  setStatus(status, 'フィードバックを送信しています…', 'info');

  try {
    await sendFeedback(createDiscordFeedbackPayload(input, context));
    setStatus(status, 'フィードバックを送信しました。ありがとうございます。', 'success');
  } catch {
    submit.disabled = false;
    email.disabled = false;
    message.disabled = false;
    setStatus(status, 'フィードバックを送信できませんでした。時間をおいて再試行してください。', 'error');
  }
});
