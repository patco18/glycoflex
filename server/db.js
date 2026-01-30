const { neon } = require('@neondatabase/serverless');

const connectionString = process.env.NEON_DATABASE_URL;
if (!connectionString) {
  throw new Error('NEON_DATABASE_URL is required to connect to PostgreSQL');
}

const sql = neon(connectionString);

module.exports = { sql };
