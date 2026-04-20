import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // ─── REQUIRED — app cannot start without these ───────────────────────────
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  DATABASE_URL: Joi.string().required(),

  // JWT — default fallback so Railway starts even before vars are injected
  JWT_ACCESS_SECRET: Joi.string().default('fallback-jwt-access-secret-servizein-2026-change-me'),
  JWT_REFRESH_SECRET: Joi.string().default('fallback-jwt-refresh-secret-servizein-2026-change-me'),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('30d'),

  // ─── OPTIONAL — app starts with empty/default if missing ─────────────────
  FRONTEND_URL: Joi.string().default('http://localhost:3001'),
  REDIS_URL: Joi.string().default('redis://localhost:6379'),

  // Twilio
  TWILIO_ACCOUNT_SID: Joi.string().allow('').default(''),
  TWILIO_AUTH_TOKEN: Joi.string().allow('').default(''),
  TWILIO_VERIFY_SERVICE_SID: Joi.string().allow('').default(''),

  // Resend
  RESEND_API_KEY: Joi.string().allow('').default(''),
  EMAIL_FROM: Joi.string().allow('').default('noreply@servizein.ma'),

  // Cloudflare R2
  R2_ACCOUNT_ID: Joi.string().allow('').default(''),
  R2_ACCESS_KEY_ID: Joi.string().allow('').default(''),
  R2_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),
  R2_BUCKET_NAME: Joi.string().allow('').default('servizein-media'),
  R2_ENDPOINT: Joi.string().allow('').default(''),
  R2_PUBLIC_URL: Joi.string().allow('').default(''),

  // Mapbox
  MAPBOX_ACCESS_TOKEN: Joi.string().allow('').default(''),

  // Firebase Admin SDK
  FIREBASE_PROJECT_ID: Joi.string().allow('').default(''),
  FIREBASE_PRIVATE_KEY_ID: Joi.string().allow('').default(''),
  FIREBASE_CLIENT_EMAIL: Joi.string().allow('').default(''),
  FIREBASE_PRIVATE_KEY: Joi.string().allow('').default(''),

  // Apple Sign-In
  APPLE_TEAM_ID: Joi.string().allow('').default(''),
  APPLE_CLIENT_ID: Joi.string().allow('').default(''),
  APPLE_KEY_ID: Joi.string().allow('').default(''),
  APPLE_PRIVATE_KEY: Joi.string().allow('').default(''),
});
