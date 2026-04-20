import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // ─── Required (app cannot start without these) ───────────────────────────
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),

  // ─── Optional with defaults ──────────────────────────────────────────────
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('30d'),

  FRONTEND_URL: Joi.string().default('http://localhost:3001'),

  REDIS_URL: Joi.string().default('redis://localhost:6379'),

  // Twilio
  TWILIO_ACCOUNT_SID: Joi.string().default(''),
  TWILIO_AUTH_TOKEN: Joi.string().default(''),
  TWILIO_VERIFY_SERVICE_SID: Joi.string().default(''),

  // Resend
  RESEND_API_KEY: Joi.string().default(''),
  EMAIL_FROM: Joi.string().default('noreply@servizein.ma'),

  // Cloudflare R2
  R2_ACCOUNT_ID: Joi.string().default(''),
  R2_ACCESS_KEY_ID: Joi.string().default(''),
  R2_SECRET_ACCESS_KEY: Joi.string().default(''),
  R2_BUCKET_NAME: Joi.string().default('servizein-media'),
  R2_ENDPOINT: Joi.string().default(''),
  R2_PUBLIC_URL: Joi.string().default(''),

  // Mapbox
  MAPBOX_ACCESS_TOKEN: Joi.string().default(''),

  // Firebase Admin SDK
  FIREBASE_PROJECT_ID: Joi.string().default(''),
  FIREBASE_PRIVATE_KEY_ID: Joi.string().default(''),
  FIREBASE_CLIENT_EMAIL: Joi.string().default(''),
  FIREBASE_PRIVATE_KEY: Joi.string().default(''),

  // Apple Sign-In
  APPLE_TEAM_ID: Joi.string().default(''),
  APPLE_CLIENT_ID: Joi.string().default(''),
  APPLE_KEY_ID: Joi.string().default(''),
  APPLE_PRIVATE_KEY: Joi.string().default(''),
});
