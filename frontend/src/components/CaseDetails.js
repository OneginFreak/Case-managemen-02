// frontend/src/components/CaseDetails.js
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import FileUpload from './FileUpload';

function CaseDetails({ token, caseId }) {
  const { t } = useTranslation();
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div>
      <h3>{t('case_details') || 'Case Details'}</h3>
      <p>Case ID: {caseId}</p>
      <button onClick={() => setShowUpload(!showUpload)}>
        {showUpload ? t('hide_upload') || 'Hide Upload' : t('upload') || 'Upload File'}
      </button>
      {showUpload && <FileUpload token={token} caseId={caseId} />}
      {/* Add more buttons as needed, e.g., manage users */}
    </div>
  );
}

export default CaseDetails;