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