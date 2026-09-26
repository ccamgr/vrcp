import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const outputPath = resolve('src/generated/feedback-webhook-config.ts');
const webhookUrl = process.env.FEEDBACK_DISCORD_WEBHOOK_URL?.trim();

if (process.env.CI === 'true' && !webhookUrl) {
  throw new Error('FEEDBACK_DISCORD_WEBHOOK_URL must be set for a Pages deployment.');
}

function createConfig(url) {
  if (!url) {
    return 'const parts: string[] = [];\n\nexport function decodeFeedbackWebhookUrl(): string | undefined {\n  return undefined;\n}\n';
  }

  const encoded = Buffer.from(url, 'utf8').toString('base64');
  const chunkLength = Math.ceil(encoded.length / 4);
  const parts = Array.from({ length: 4 }, (_, index) => encoded.slice(index * chunkLength, (index + 1) * chunkLength));

  return `const parts = ${JSON.stringify(parts)};\n\nexport function decodeFeedbackWebhookUrl(): string | undefined {\n  return atob(parts.join(''));\n}\n`;
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, createConfig(webhookUrl), 'utf8');
