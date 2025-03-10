Here’s a comprehensive response to address your query about the missing HTML files and adding user management to cases for file uploads and downloads in the case management system.

Addressing Missing HTML Files and Case Management for File Access
Your query highlights two main issues: the absence of HTML files for the application and the need to manage user access to cases so users can upload and download files from S3 storage. Below, I’ll provide a complete solution for both, ensuring the system is functional and meets your requirements.

1. Missing HTML Files for the Application
In a React-based frontend (assumed from the context of a modern web application), the primary HTML file is typically index.html, which serves as the entry point for the app. This file is usually placed in the frontend/public directory and provides the structure where the React application mounts.

Solution: Adding index.html
To resolve the missing HTML files, create a file named index.html in the frontend/public directory with the following content:

html

Preview

Collapse

Wrap

Copy
<!DOCTYPE html>
<html lang="no">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Case Management System</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
Explanation:
The lang="no" attribute sets Norwegian as the default language, aligning with the system’s requirements.
The <div id="root"></div> is where the React app renders its components.
This file ensures the frontend has a proper entry point to load the application.
Place this file in frontend/public, and the React build process will use it to serve the app.

2. Case Management: Adding Users to Cases for File Uploads and Downloads
To enable users to upload and download files from S3 storage, we need to implement user access management for cases. This involves:

Allowing administrators to add users to cases with specific access levels (e.g., read, write, admin).
Enforcing these access levels for file operations (uploads and downloads).
Providing frontend and backend support for these features.
Backend: APIs for User Access Management
Assuming a Node.js/Express backend with a PostgreSQL database (via Knex.js) and S3 for file storage, we’ll add routes to manage user access to cases. These routes will be added to backend/src/routes/cases.js.

javascript

Collapse

Wrap

Copy
// backend/src/routes/cases.js
const express = require('express');
const { knex } = require('../server'); // Assuming knex is configured in server.js
const router = express.Router();

// Middleware to authenticate user (assumed to exist)
const authMiddleware = require('../middleware/auth'); // Adjust path as needed
router.use(authMiddleware);

// Add user to a case
router.post('/:id/add-user', async (req, res) => {
  const { userId, accessLevel } = req.body; // e.g., { userId: 2, accessLevel: 'write' }
  const caseId = req.params.id;

  // Check if requester has admin access to the case
  const access = await knex('user_case_access')
    .where({ user_id: req.user.id, case_id: caseId, access_level: 'admin' })
    .first();
  if (!access) return res.status(403).json({ error: 'No admin access' });

  await knex('user_case_access').insert({
    user_id: userId,
    case_id: caseId,
    access_level: accessLevel,
  });
  res.json({ message: 'User added to case' });
});

// Remove user from a case
router.delete('/:id/remove-user/:userId', async (req, res) => {
  const caseId = req.params.id;
  const userId = req.params.userId;

  // Check if requester has admin access
  const access = await knex('user_case_access')
    .where({ user_id: req.user.id, case_id: caseId, access_level: 'admin' })
    .first();
  if (!access) return res.status(403).json({ error: 'No admin access' });

  await knex('user_case_access')
    .where({ user_id: userId, case_id: caseId })
    .delete();
  res.json({ message: 'User removed from case' });
});

// Get users associated with a case
router.get('/:id/users', async (req, res) => {
  const caseId = req.params.id;

  // Check if requester has any access to the case
  const access = await knex('user_case_access')
    .where({ user_id: req.user.id, case_id: caseId })
    .first();
  if (!access) return res.status(403).json({ error: 'No access to case' });

  const users = await knex('user_case_access')
    .join('users', 'user_case_access.user_id', 'users.id')
    .where('user_case_access.case_id', caseId)
    .select('users.id', 'users.username', 'user_case_access.access_level');
  res.json(users);
});

module.exports = router;
Database Schema Assumption:
user_case_access table: user_id, case_id, access_level (e.g., 'read', 'write', 'admin').
users table: id, username, etc.
Access Levels:
read: Can view and download files.
write: Can upload files (includes read permissions).
admin: Can manage users and perform all actions.
Backend: Enforcing Access for File Operations
Update the file routes in backend/src/routes/files.js to enforce access controls:

javascript

Collapse

Wrap

Copy
// backend/src/routes/files.js
const express = require('express');
const { knex } = require('../server');
const AWS = require('aws-sdk');
const router = express.Router();

const s3 = new AWS.S3({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
});

// Prepare file upload to S3
router.post('/prepare-upload', async (req, res) => {
  const { caseId, filename, contentType } = req.body;

  // Check for write or admin access
  const access = await knex('user_case_access')
    .where({ user_id: req.user.id, case_id: caseId })
    .whereIn('access_level', ['write', 'admin'])
    .first();
  if (!access) return res.status(403).json({ error: 'No write access' });

  const key = `cases/${caseId}/files/${filename}`;
  const url = s3.getSignedUrl('putObject', {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    Expires: 300, // 5 minutes
  });

  await knex('files').insert({
    case_id: caseId,
    filename,
    content_type: contentType,
    creator_id: req.user.id,
  });

  res.json({ url, key });
});

// Download file from S3
router.get('/download/:id', async (req, res) => {
  const file = await knex('files').where({ id: req.params.id }).first();

  // Check for read, write, or admin access
  const access = await knex('user_case_access')
    .where({ user_id: req.user.id, case_id: file.case_id })
    .whereIn('access_level', ['read', 'write', 'admin'])
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
Explanation:
Upload requires write or admin access.
Download allows read, write, or admin access.
Frontend: Managing Users and File Access
Create a CaseDetails component to display case details, manage users, and handle file uploads/downloads:

javascript

Collapse

Wrap

Copy
// frontend/src/components/CaseDetails.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FileUpload from './FileUpload'; // Existing component assumed
import CaseUsers from './CaseUsers';

function CaseDetails({ token, caseId }) {
  const [caseData, setCaseData] = useState(null);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetchCaseData();
    fetchFiles();
  }, [caseId]);

  const fetchCaseData = async () => {
    const res = await axios.get(`http://localhost:3000/api/cases/${caseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setCaseData(res.data);
  };

  const fetchFiles = async () => {
    const res = await axios.get(`http://localhost:3000/api/files?caseId=${caseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setFiles(res.data);
  };

  if (!caseData) return <div>Loading...</div>;

  return (
    <div>
      <h2>{caseData.title}</h2>
      <p>{caseData.description}</p>
      <h3>Files</h3>
      <ul>
        {files.map((file) => (
          <li key={file.id}>
            {file.filename} - <a href={file.file_url}>Download</a>
          </li>
        ))}
      </ul>
      <FileUpload token={token} caseId={caseId} />
      <CaseUsers token={token} caseId={caseId} />
    </div>
  );
}

export default CaseDetails;
Create a CaseUsers component for managing users:

javascript

Collapse

Wrap

Copy
// frontend/src/components/CaseUsers.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function CaseUsers({ token, caseId }) {
  const [users, setUsers] = useState([]);
  const [newUserId, setNewUserId] = useState('');
  const [newAccessLevel, setNewAccessLevel] = useState('read');

  useEffect(() => {
    fetchUsers();
  }, [caseId]);

  const fetchUsers = async () => {
    const res = await axios.get(`http://localhost:3000/api/cases/${caseId}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsers(res.data);
  };

  const addUser = async () => {
    await axios.post(
      `http://localhost:3000/api/cases/${caseId}/add-user`,
      { userId: newUserId, accessLevel: newAccessLevel },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchUsers();
    setNewUserId('');
  };

  const removeUser = async (userId) => {
    await axios.delete(`http://localhost:3000/api/cases/${caseId}/remove-user/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchUsers();
  };

  return (
    <div>
      <h3>Manage Users</h3>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.username} - {user.access_level}
            <button onClick={() => removeUser(user.id)}>Remove</button>
          </li>
        ))}
      </ul>
      <div>
        <input
          type="text"
          placeholder="User ID"
          value={newUserId}
          onChange={(e) => setNewUserId(e.target.value)}
        />
        <select value={newAccessLevel} onChange={(e) => setNewAccessLevel(e.target.value)}>
          <option value="read">Read</option>
          <option value="write">Write</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={addUser}>Add User</button>
      </div>
    </div>
  );
}

export default CaseUsers;
Notes:
The FileUpload component is assumed to exist and handle S3 uploads using the /prepare-upload endpoint.
For a production system, replace the newUserId text input with a user selection dropdown populated from a /users API.
Additional Backend Route for File Listing
Add a route to fetch files for a case:

javascript

Collapse

Wrap

Copy
// backend/src/routes/files.js
router.get('/', async (req, res) => {
  const { caseId } = req.query;

  // Check access to the case
  const access = await knex('user_case_access')
    .where({ user_id: req.user.id, case_id: caseId })
    .whereIn('access_level', ['read', 'write', 'admin'])
    .first();
  if (!access) return res.status(403).json({ error: 'No access to case' });

  const files = await knex('files').where({ case_id: caseId });
  res.json(files);
});
Summary
HTML Files: Added index.html to frontend/public to provide the React app’s entry point.
User Management:
Backend APIs allow adding/removing users to cases with specific access levels.
Frontend components (CaseDetails and CaseUsers) enable administrators to manage user access.
File Access:
Uploads are restricted to users with write or admin access.
Downloads are permitted for users with read, write, or admin access.
This solution ensures that users can be added to cases and that file operations from S3 storage are securely managed based on their access levels. Let me know if you need further adjustments!