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