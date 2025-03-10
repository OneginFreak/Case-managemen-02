import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CaseList from './components/CaseList';
import CaseDetails from './components/CaseDetails';
import LanguageSwitcher from './components/LanguageSwitcher';
import './i18n';

function App() {
  const { t } = useTranslation();
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [error, setError] = useState('');

  const handleLogin = async (username, password) => {
    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setError('');
      } else {
        setError(data.error || t('error'));
      }
    } catch (err) {
      setError(t('error'));
    }
  };

  return (
    <div>
      <h1>{t('welcome')}</h1>
      <LanguageSwitcher />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!token ? (
        <div>
          <input placeholder="Username" id="username" />
          <input type="password" placeholder="Password" id="password" />
          <button
            onClick={() => handleLogin(document.getElementById('username').value, document.getElementById('password').value)}
          >
            Login
          </button>
        </div>
      ) : (
        <>
          <CaseList token={token} onSelectCase={setSelectedCaseId} />
          {selectedCaseId && <CaseDetails token={token} caseId={selectedCaseId} />}
        </>
      )}
    </div>
  );
}

export default App;