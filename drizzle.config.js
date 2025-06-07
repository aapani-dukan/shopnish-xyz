import 'dotenv/config';

export default {
  schema: './shared/schema.ts',
  out: './server/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
};
