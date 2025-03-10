# Case-managemen-02

System Overview
You need an internal file storage and management system similar to Google Drive or OneDrive, integrated with Amazon S3 for file storage, tied to "cases" with metadata and access controls. The system must handle large files, map internal cases to external case numbers, support multiple languages (defaulting to Norwegian), and run in Docker containers for easy deployment. Here's how we’ll build it:

Cases: Each case has metadata (e.g., title, description) and associated files.
Files: Stored in S3, with metadata (e.g., tags, category) in a database.
Access Control: Role-based permissions (e.g., read, write, admin) for users.
External Case Mapping: Link internal case IDs to external system case numbers.
Language Support: Multi-language UI with Norwegian as the default.
Deployment: Dockerized for scalability and ease of deployment.
1. Technology Stack
Frontend
React.js: For a dynamic, interactive UI.
Uppy: For file uploads (supports multipart uploads to S3).
react-i18next: For multi-language support.
Axios: For API requests.
Backend
Node.js with Express.js: For RESTful APIs.
PostgreSQL: Relational database for cases, files, users, and access controls.
AWS SDK: For S3 integration (file uploads/downloads).
Knex.js: For database migrations and queries.
JWT: For authentication.
Bcrypt: For password hashing.
File Storage
Amazon S3: Scalable storage for files.
Deployment
Docker: Containerizes the frontend, backend, and database.
Docker Compose: Orchestrates the services.
2. Database Schema
Here’s the schema to support cases, files, access controls, and external case mappings:

Tables
Users
Field	Type	Description
id	INTEGER (PK)	Primary key
username	VARCHAR	Unique username
password	VARCHAR	Hashed password
role	VARCHAR	Role (e.g., viewer, editor, admin)
created_at	TIMESTAMP	Creation timestamp
Cases
Field	Type	Description
id	INTEGER (PK)	Primary key
title	VARCHAR	Case title
description	TEXT	Case description
created_by	INTEGER (FK)	Foreign key to Users
created_at	TIMESTAMP	Creation timestamp
updated_at	TIMESTAMP	Last update timestamp
Files
Field	Type	Description
id	INTEGER (PK)	Primary key
filename	VARCHAR	File name
file_url	VARCHAR	S3 URL
file_type	VARCHAR	MIME type (e.g., pdf, mp4)
file_size	BIGINT	Size in bytes
metadata	JSON	Custom metadata (e.g., tags)
uploaded_at	TIMESTAMP	Upload timestamp
case_id	INTEGER (FK)	Foreign key to Cases
uploaded_by	INTEGER (FK)	Foreign key to Users
UserCaseAccess (Access Control)
Field	Type	Description
id	INTEGER (PK)	Primary key
user_id	INTEGER (FK)	Foreign key to Users
case_id	INTEGER (FK)	Foreign key to Cases
access_level	VARCHAR	Access level (read, write, admin)
created_at	TIMESTAMP	Creation timestamp
InternalExternalCaseMapping
Field	Type	Description
id	INTEGER (PK)	Primary key
internal_case_id	INTEGER (FK)	Foreign key to Cases
external_case_id	VARCHAR	External case number
external_system	VARCHAR	External system name
created_at	TIMESTAMP	Creation timestamp
updated_at	TIMESTAMP	Last update timestamp
3. Backend Implementation (Node.js with Express)
Directory Structure
text

Collapse

Wrap

Copy
backend/
├── src/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── cases.js
│   │   ├── files.js
│   │   └── external.js
│   ├── middleware/
│   │   └── auth.js
│   ├── knexfile.js
│   └── server.js
├── migrations/
├── Dockerfile
└── package.json
Key Files
backend/package.json
json

Collapse

Wrap

Copy
{
  "name": "case-management-backend",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "migrate": "knex migrate:latest"
  },
  "dependencies": {
    "express": "^4.17.1",
    "knex": "^0.95.11",
    "pg": "^8.7.1",
    "aws-sdk": "^2.1000.0",
    "jsonwebtoken": "^8.5.1",
    "bcrypt": "^5.0.1"
  }
}
backend/src/server.js
javascript

Collapse

Wrap

Copy
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

const app = express();
const port = 3000;

app.use(express.json());
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1', // Adjust as needed
});
const s3 = new AWS.S3();

app.use('/api/auth', authRoutes);
app.use('/api/cases', authenticate, caseRoutes);
app.use('/api/files', authenticate, fileRoutes);
app.use('/api/external', authenticate, externalRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = { knex, s3 };
backend/src/middleware/auth.js
javascript

Collapse

Wrap

Copy
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authenticate;
backend/src/routes/auth.js
javascript

Collapse

Wrap

Copy
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { knex } = require('../server');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await knex('users').where({ username }).first();
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const [user] = await knex('users').insert({ username, password: hashedPassword, role }).returning('*');
  res.json(user);
});

module.exports = router;
backend/src/routes/files.js
javascript

Collapse

Wrap

Copy
const express = require('express');
const { knex, s3 } = require('../server');
const router = express.Router();

router.post('/prepare-upload', async (req, res) => {
  const { caseId, filename, contentType } = req.body;
  const access = await knex('user_case_access')
    .where({ user_id: req.user.id, case_id: caseId, access_level: 'write' })
    .first();
  if (!access) return res.status(403).json({ error: 'No write access' });

  const key = `cases/${caseId}/files/${filename}`;
  const params = { Bucket: process.env.S3_BUCKET, Key: key, ContentType: contentType };
  const upload = await s3.createMultipartUpload(params).promise();
  res.json({ uploadId: upload.UploadId, key });
});

router.get('/sign-part', (req, res) => {
  const { key, uploadId, partNumber } = req.query;
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
    Expires: 300,
  };
  const url = s3.getSignedUrl('uploadPart', params);
  res.json({ url });
});

router.post('/complete-upload', async (req, res) => {
  const { key, uploadId, parts, caseId, contentType, fileSize, metadata } = req.body;
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  };
  await s3.completeMultipartUpload(params).promise();

  await knex('files').insert({
    filename: key.split('/').pop(),
    file_url: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`,
    file_type: contentType,
    file_size: fileSize,
    metadata,
    uploaded_at: new Date(),
    case_id: caseId,
    uploaded_by: req.user.id,
  });
  res.json({ message: 'Upload completed' });
});

router.get('/download/:id', async (req, res) => {
  const file = await knex('files').where({ id: req.params.id }).first();
  const access = await knex('user_case_access')
    .where({ user_id: req.user.id, case_id: file.case_id, access_level: 'read' })
    .first();
  if (!access) return res.status(403).json({ error: 'No read access' });

  const url = s3.getSignedUrl('getObject', {
    Bucket: process.env.S3_BUCKET,
    Key: `cases/${file.case_id}/files/${file.filename}`,
    Expires: 300,
  });
  res.json({ url });
});

module.exports = router;
backend/src/routes/cases.js
javascript

Collapse

Wrap

Copy
const express = require('express');
const { knex } = require('../server');
const router = express.Router();

router.get('/', async (req, res) => {
  const cases = await knex('cases')
    .join('user_case_access', 'cases.id', 'user_case_access.case_id')
    .where('user_case_access.user_id', req.user.id)
    .select('cases.*');
  res.json(cases);
});

router.post('/', async (req, res) => {
  const { title, description } = req.body;
  const [case] = await knex('cases')
    .insert({ title, description, created_by: req.user.id })
    .returning('*');
  await knex('user_case_access').insert({
    user_id: req.user.id,
    case_id: case.id,
    access_level: 'admin',
  });
  res.json(case);
});

module.exports = router;
backend/src/routes/external.js
javascript

Collapse

Wrap

Copy
const express = require('express');
const { knex } = require('../server');
const router = express.Router();

router.post('/cases/:id/external-case-mapping', async (req, res) => {
  const { external_case_id, external_system } = req.body;
  const [mapping] = await knex('internal_external_case_mapping')
    .insert({
      internal_case_id: req.params.id,
      external_case_id,
      external_system,
    })
    .returning('*');
  res.json(mapping);
});

router.get('/cases/:id/external-case-mapping', async (req, res) => {
  const mapping = await knex('internal_external_case_mapping')
    .where({ internal_case_id: req.params.id })
    .first();
  res.json(mapping || {});
});

module.exports = router;
backend/migrations/20231001_create_tables.js
javascript

Collapse

Wrap

Copy
exports.up = function (knex) {
  return Promise.all([
    knex.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username').notNullable().unique();
      table.string('password').notNullable();
      table.string('role').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    }),
    knex.schema.createTable('cases', (table) => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('description');
      table.integer('created_by').references('id').inTable('users');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    }),
    knex.schema.createTable('files', (table) => {
      table.increments('id').primary();
      table.string('filename').notNullable();
      table.string('file_url').notNullable();
      table.string('file_type');
      table.bigint('file_size');
      table.json('metadata');
      table.timestamp('uploaded_at').defaultTo(knex.fn.now());
      table.integer('case_id').references('id').inTable('cases');
      table.integer('uploaded_by').references('id').inTable('users');
    }),
    knex.schema.createTable('user_case_access', (table) => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users');
      table.integer('case_id').references('id').inTable('cases');
      table.string('access_level').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    }),
    knex.schema.createTable('internal_external_case_mapping', (table) => {
      table.increments('id').primary();
      table.integer('internal_case_id').references('id').inTable('cases');
      table.string('external_case_id').notNullable();
      table.string('external_system').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    }),
  ]);
};

exports.down = function (knex) {
  return Promise.all([
    knex.schema.dropTable('internal_external_case_mapping'),
    knex.schema.dropTable('user_case_access'),
    knex.schema.dropTable('files'),
    knex.schema.dropTable('cases'),
    knex.schema.dropTable('users'),
  ]);
};
backend/Dockerfile
dockerfile

Collapse

Wrap

Copy
FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["sh", "-c", "npm run migrate && npm start"]
4. Frontend Implementation (React.js)
Directory Structure
text

Collapse

Wrap

Copy
frontend/
├── src/
│   ├── components/
│   │   ├── CaseList.js
│   │   ├── FileUpload.js
│   │   └── LanguageSwitcher.js
│   ├── locales/
│   │   ├── no.json
│   │   └── en.json
│   ├── App.js
│   └── i18n.js
├── Dockerfile
└── package.json
Key Files
frontend/package.json
json

Collapse

Wrap

Copy
{
  "name": "case-management-frontend",
  "version": "1.0.0",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  },
  "dependencies": {
    "react": "^17.0.2",
    "react-dom": "^17.0.2",
    "react-scripts": "4.0.3",
    "@uppy/core": "^2.0.0",
    "@uppy/aws-s3-multipart": "^2.0.0",
    "axios": "^0.24.0",
    "i18next": "^21.6.0",
    "react-i18next": "^11.15.0"
  }
}
frontend/src/i18n.js
javascript

Collapse

Wrap

Copy
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import no from './locales/no.json';
import en from './locales/en.json';

i18n.use(initReactI18next).init({
  resources: {
    no: { translation: no },
    en: { translation: en },
  },
  lng: 'no', // Default language: Norwegian
  fallbackLng: 'no',
  interpolation: { escapeValue: false },
});

export default i18n;
frontend/src/locales/no.json
json

Collapse

Wrap

Copy
{
  "welcome": "Velkommen",
  "cases": "Saker",
  "upload": "Last opp",
  "download": "Last ned"
}
frontend/src/locales/en.json
json

Collapse

Wrap

Copy
{
  "welcome": "Welcome",
  "cases": "Cases",
  "upload": "Upload",
  "download": "Download"
}
frontend/src/App.js
javascript

Collapse

Wrap

Copy
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CaseList from './components/CaseList';
import FileUpload from './components/FileUpload';
import LanguageSwitcher from './components/LanguageSwitcher';
import './i18n';

function App() {
  const { t } = useTranslation();
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  const handleLogin = async (username, password) => {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.token) {
      setToken(data.token);
      localStorage.setItem('token', data.token);
    }
  };

  return (
    <div>
      <h1>{t('welcome')}</h1>
      <LanguageSwitcher />
      {!token ? (
        <div>
          <input placeholder="Username" id="username" />
          <input type="password" placeholder="Password" id="password" />
          <button onClick={() => handleLogin(document.getElementById('username').value, document.getElementById('password').value)}>
            Login
          </button>
        </div>
      ) : (
        <>
          <CaseList token={token} />
          <FileUpload token={token} caseId={1} /> {/* Replace with dynamic caseId */}
        </>
      )}
    </div>
  );
}

export default App;
frontend/src/components/CaseList.js
javascript

Collapse

Wrap

Copy
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

function CaseList({ token }) {
  const { t } = useTranslation();
  const [cases, setCases] = useState([]);

  useEffect(() => {
    axios
      .get('http://localhost:3000/api/cases', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setCases(res.data));
  }, [token]);

  return (
    <div>
      <h2>{t('cases')}</h2>
      <ul>
        {cases.map((c) => (
          <li key={c.id}>{c.title}</li>
        ))}
      </ul>
    </div>
  );
}

export default CaseList;
frontend/src/components/FileUpload.js
javascript

Collapse

Wrap

Copy
import React from 'react';
import Uppy from '@uppy/core';
import AwsS3Multipart from '@uppy/aws-s3-multipart';
import { Dashboard } from '@uppy/react';
import '@uppy/core/dist/style.css';
import '@uppy/dashboard/dist/style.css';

function FileUpload({ token, caseId }) {
  const uppy = new Uppy().use(AwsS3Multipart, {
    limit: 4,
    companionHeaders: { Authorization: `Bearer ${token}` },
    async createMultipartUpload(file) {
      const res = await fetch('http://localhost:3000/api/files/prepare-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ caseId, filename: file.name, contentType: file.type }),
      });
      const data = await res.json();
      return { uploadId: data.uploadId, key: data.key };
    },
    async signPart(file, { uploadId, key, partNumber }) {
      const res = await fetch(
        `http://localhost:3000/api/files/sign-part?key=${key}&uploadId=${uploadId}&partNumber=${partNumber}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      return data.url;
    },
    async completeMultipartUpload(file, { uploadId, key, parts }) {
      await fetch('http://localhost:3000/api/files/complete-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key, uploadId, parts, caseId, contentType: file.type, fileSize: file.size }),
      });
    },
  });

  return <Dashboard uppy={uppy} />;
}

export default FileUpload;
frontend/src/components/LanguageSwitcher.js
javascript

Collapse

Wrap

Copy
import React from 'react';
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select onChange={(e) => i18n.changeLanguage(e.target.value)} value={i18n.language}>
      <option value="no">Norsk</option>
      <option value="en">English</option>
    </select>
  );
}

export default LanguageSwitcher;
frontend/Dockerfile
dockerfile

Collapse

Wrap

Copy
FROM node:14 as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
5. Docker Configuration
docker-compose.yml
yaml

Collapse

Wrap

Copy
version: '3'
services:
  db:
    image: postgres:13
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: casedb
    volumes:
      - pgdata:/var/lib/postgresql/data
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    depends_on:
      - db
    environment:
      DATABASE_URL: postgres://user:password@db:5432/casedb
      AWS_ACCESS_KEY_ID: your-access-key
      AWS_SECRET_ACCESS_KEY: your-secret-key
      S3_BUCKET: your-s3-bucket
      JWT_SECRET: your-jwt-secret
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  pgdata:
6. Handling Large Files
The system uses S3 multipart uploads to handle large files efficiently:

Backend: Generates pre-signed URLs for each part of the file and completes the upload once all parts are uploaded.
Frontend: Uses Uppy with the AwsS3Multipart plugin to upload files in chunks directly to S3, offloading the server.
7. Security & Permissions
Authentication: JWT tokens secure API endpoints.
Authorization: Middleware checks user roles and access levels (e.g., read, write) before allowing actions.
Encryption: Use HTTPS and S3 encryption at rest (via AWS KMS) for sensitive files.
8. Conclusion
This solution provides:

A scalable file storage system with S3 integration.
Case management with metadata and access controls.
Support for large files via multipart uploads.
Mapping of internal cases to external case numbers.
Multi-language support with Norwegian as the default.
Dockerized deployment for easy setup.
To deploy:

Replace placeholders in docker-compose.yml (e.g., AWS keys, bucket name).
Run docker-compose up --build in the root directory.
Would you like further details on any specific part?