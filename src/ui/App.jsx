import React, { useState, useEffect } from 'react';
import AuthPage from './AuthPage.jsx';
import Menu from './Menu.jsx';
import Dashboard from './Dashboard.jsx';

import './App.css';

export default function App() {
  // JWT token indicates authentication state
  const [token, setToken] = useState(null);

  // View state: 'menu' or 'settings'
  const [view, setView] = useState('menu');

  // On mount, check for existing token
  useEffect(() => {
    window.authAPI.getTokens().then(tokens => {
      if (tokens.accessToken) {
        setToken(tokens.accessToken);
      }
    });
  }, []);

  // Called by AuthPage after successful login
  const handleAuthSuccess = (jwtToken) => {
    setToken(jwtToken);
  };

  // If not authenticated, render login
  if (!token) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Authenticated: show main menu or settings
  if (view === 'menu') {
    return (
      <Menu
        onStart={() => window.scraperAPI.start()}
        onSettings={() => setView('settings')}
      />
    );
  }

  return <Dashboard onBack={() => setView('menu')} />;
}
