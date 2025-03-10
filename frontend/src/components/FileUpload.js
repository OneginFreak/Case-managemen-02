import React from 'react';
import Uppy from '@uppy/core';
import AwsS3Multipart from '@uppy/aws-s3-multipart';
import Dashboard from '@uppy/dashboard'; // Use default import for the plugin
import '@uppy/core/dist/style.css';
import '@uppy/dashboard/dist/style.css';

function FileUpload({ token, caseId }) {
  const uppy = new Uppy({
    autoProceed: true,
  })
    .use(AwsS3Multipart, {
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
    })
    .use(Dashboard, {
      inline: true,
      target: '#uppy-dashboard', // Render the dashboard inline in this DOM element
    });

  // The Dashboard is rendered by Uppy when inline: true is set
  return <div id="uppy-dashboard"></div>;
}

export default FileUpload;