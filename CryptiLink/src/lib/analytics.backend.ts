import { PostHog } from 'posthog-node';

let client: PostHog | null = null;

export function getPosthogBackend(): PostHog {
  if (client) return client;

  if (!process.env.POSTHOG_API_KEY) {
    throw new Error('[CryptiLink] POSTHOG_API_KEY is required');
  }

  client = new PostHog(process.env.POSTHOG_API_KEY, {
    host: process.env.POSTHOG_HOST,
    flushAt: 20,
    flushInterval: 10000,
  });

  process.on('exit', () => {
    if (client) {
      void client.shutdown();
    }
  });

  process.on('SIGTERM', () => {
    if (client) {
      void client.shutdown();
    }
  });

  return client;
}
