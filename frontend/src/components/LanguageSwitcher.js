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