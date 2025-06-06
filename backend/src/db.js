const knex = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});
const { S3Client } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: 'us-east-1',
});

module.exports = { knex, s3 };