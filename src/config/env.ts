import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'crm_elevate_super_secure_jwt_secret_key_2026',
  cookieSecret: process.env.COOKIE_SECRET || 'crm_elevate_cookie_secret_key_2026_very_long',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};
