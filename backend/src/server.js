// backend/src/server.js
const express = require('express');
const { knex, s3 } = require('./db');
const { logAction } = require('./utils/audit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const authRoutes = require('./routes/auth');
const caseRoutes = require('./routes/cases');
const fileRoutes = require('./routes/files');
const externalRoutes = require('./routes/external');
const authenticate = require('./middleware/auth');

const app = express();
const port = 3000;

app.use(express.json());

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