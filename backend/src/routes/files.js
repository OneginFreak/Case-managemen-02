// backend/src/routes/files.js
const express = require('express');
const { knex, s3 } = require('../db');
const { logAction } = require('../utils/audit');
const {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const router = express.Router();

// Prepare multipart upload
router.post('/prepare-upload', async (req, res) => {
  const { caseId, filename, contentType } = req.body;
  const access = await knex('user_case_access')
    .where({ user_id: req.user.id, case_id: caseId })
    .whereIn('access_level', ['write', 'admin'])
    .first();
  if (!access) return res.status(403).json({ error: 'No write access' });

  const key = `cases/${caseId}/files/${filename}`;
  const command = new CreateMultipartUploadCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const upload = await s3.send(command);
  res.json({ uploadId: upload.UploadId, key });
});

// Sign part for upload
router.get('/sign-part', async (req, res) => {
  const { key, uploadId, partNumber } = req.query;
  const command = new UploadPartCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    UploadId: uploadId,
    PartNumber: Number(partNumber),
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 300 });
  res.json({ url });
});

// Complete multipart upload
router.post('/complete-upload', async (req, res) => {
  const { key, uploadId, parts, caseId, contentType, fileSize, metadata } = req.body;
  const command = new CompleteMultipartUploadCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });
  await s3.send(command);

  const [file] = await knex('files')
    .insert({
      filename: key.split('/').pop(),
      file_url: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`,
      file_type: contentType,
      file_size: fileSize,
      metadata,
      case_id: caseId,
      uploaded_by: req.user.id,
    })
    .returning('*');

  await logAction(req.user.id, 'upload_file', 'file', file.id, { filename: file.filename });
  res.json({ message: 'Upload completed', file });
});

// Download file
router.get('/download/:id', async (req, res) => {
  const file = await knex('files').where({ id: req.params.id }).first();
  if (!file) return res.status(404).json({ error: 'File not found' });

  const access = await knex('user_case_access')
    .where({ user_id: req.user.id, case_id: file.case_id })
    .whereIn('access_level', ['read', 'write', 'admin'])
    .first();
  if (!access) return res.status(403).json({ error: 'No read access' });

  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: `cases/${file.case_id}/files/${file.filename}`,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 300 });
  res.json({ url });
});

module.exports = router;