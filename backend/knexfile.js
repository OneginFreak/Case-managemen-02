// backend/knexfile.js
module.exports = {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds', // Optional, if you use seeds
    },
  };