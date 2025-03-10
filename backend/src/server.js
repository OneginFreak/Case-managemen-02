const express = require('express');
const knex = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const authRoutes = require('./routes/auth');
const caseRoutes = require('./routes/cases');
const fileRoutes = require('./routes/files');
const externalRoutes = require('./routes/external');
const authenticate = require('./middleware/auth');
const { logAction } = require('./utils/audit');

const app = express();
const port = 3000;

app.use(express.json());
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1',
});
const s3 = new AWS.S3();

app.use('/api/auth', authRoutes);
app.use('/api/cases', authenticate, caseRoutes);
app.use('/api/files', authenticate, fileRoutes);
app.use('/api/external', authenticate, externalRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = { app, knex, s3, logAction }; // Exported for testing