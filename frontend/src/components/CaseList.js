import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function CaseList({ token, onSelectCase }) {
  const { t } = useTranslation();
  const [cases, setCases] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Fetch cases on mount
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/cases', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setCases(data);
      } catch (err) {
        setError(t('error'));
      }
    };
    fetchCases();
  }, [token, t]);

  // Handle case creation
  const handleCreateCase = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/api/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description }),
      });
      const newCase = await res.json();
      setCases([...cases, newCase]); // Add new case to list
      setTitle(''); // Clear form
      setDescription('');
      setError('');
    } catch (err) {
      setError(t('error'));
    }
  };

  return (
    <div>
      <h2>{t('cases')}</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {/* Case Creation Form */}
      <form onSubmit={handleCreateCase}>
        <input
          type="text"
          placeholder="Case Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Case Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit">{t('create_case') || 'Create Case'}</button>
      </form>
      {/* Case List */}
      <ul>
        {cases.length === 0 ? (
          <p>No cases found</p>
        ) : (
          cases.map((caseItem) => (
            <li key={caseItem.id}>
              <button onClick={() => onSelectCase(caseItem.id)}>
                {caseItem.title}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default CaseList;