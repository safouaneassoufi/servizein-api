import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  FRONTEND_URL: Joi.string().required(),

  DATABASE_URL: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('30d'),

  REDIS_URL: Joi.string().required(),

  TWILIO_ACCOUNT_SID: Joi.string().required(),
  TWILIO_AUTH_TOKEN: Joi.string().required(),
  TWILIO_VERIFY_SERVICE_SID: Joi.string().required(),

  RESEND_API_KEY: Joi.string().required(),
  EMAIL_FROM: Joi.string().required(),

  R2_ACCOUNT_ID: Joi.string().required(),
  R2_ACCESS_KEY_ID: Joi.string().required(),
  R2_SECRET_ACCESS_KEY: Joi.string().required(),
  R2_BUCKET_NAME: Joi.string().required(),
  R2_ENDPOINT: Joi.string().required(),
  R2_PUBLIC_URL: Joi.string().required(),

  MAPBOX_ACCESS_TOKEN: Joi.string().required(),
});
