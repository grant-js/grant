'use strict';

require('dotenv').config();

module.exports = {
  schema: './src/schemas/**/*.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DB_URL || process.env.DATABASE_URL,
  },
  entities: {
    roles: true,
  },
  verbose: true,
  strict: true,
};
