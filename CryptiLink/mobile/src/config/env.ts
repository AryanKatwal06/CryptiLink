import Config from 'react-native-config';

function requireEnv(key: string): string {
  const value = Config[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `[CryptiLink] Missing required environment variable: ${key}. Add it to your .env file.`,
    );
  }
  return value;
}

function optionalEnv(key: string, defaultValue = ''): string {
  return Config[key] ?? defaultValue;
}

export const ENV = {
  APP_ENV: optionalEnv('APP_ENV', 'development'),
  IS_DEV: optionalEnv('APP_ENV', 'development') === 'development',
  IS_PROD: optionalEnv('APP_ENV') === 'production',

  API_BASE_URL: requireEnv('API_BASE_URL'),

  DATABASE_URL: optionalEnv('DATABASE_URL'),

  FIREBASE_PROJECT_ID: requireEnv('FIREBASE_PROJECT_ID'),


  POSTHOG_API_KEY: requireEnv('POSTHOG_API_KEY'),
  POSTHOG_HOST: requireEnv('POSTHOG_HOST'),
} as const;

