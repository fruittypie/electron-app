import React, { useState, useEffect } from 'react';
import AuthPage from './AuthPage.jsx';
import Menu from './Menu.jsx';
import Settings from './Settings.jsx';
import LogPanel from './LogPanel.jsx';
import './App.css';

export default function App() {
  const [token, setToken] = useState(null);
  const [view, setView] = useState('menu'); // 'menu' | 'settings'
  const [settings, setSettings] = useState(null);
  const [isScriptRunning, setIsScriptRunning] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  // Load authentication token and scraper settings on mount
  useEffect(() => {
    // Fetch stored JWT
    window.authAPI.getTokens().then(tokens => {
      if (tokens.accessToken) setToken(tokens.accessToken);
    });
    // Fetch scraper settings via IPC directly
    window.electron.invoke('get-scraper-settings').then(fetched => {
      setSettings(fetched);
    }).catch(err => {
      console.error('Failed to load settings:', err);
    });
  }, []);

   // Handle "scraper-finished" event
  useEffect(() => {
    const onFinished = () => {
      setIsScriptRunning(false);
      setIsStopping(false);
    };

    window.electron.on('scraper-finished', onFinished);
    return () => {
      window.electron.off('scraper-finished', onFinished);
    };
  }, []);

  // If not logged in, show AuthPage
  if (!token) {
    return <AuthPage onAuthSuccess={jwt => setToken(jwt)} />;
  }

  // While settings are loading
  if (!settings) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <span className="text-gray-700 dark:text-gray-200">Loading settings...</span>
      </div>
    );
  }

  // Render Settings view
  if (view === 'settings') {
    return (
      <Settings
        settings={settings}
        isScriptRunning={isScriptRunning}
        isStopping={isStopping}
        onSave={async newSettings => {
          const result = await window.electron.invoke('save-scraper-settings', newSettings);
          if (result.success) {
            setSettings(newSettings);
            setView('menu');
          } else {
            console.error('Save settings failed:', result.error);
          }
        }}
        onBack={() => setView('menu')}
      />
    );
  }

return (
    <div className="flex h-screen">
      {/* Sidebar: 1/3 width, centered vertical buttons */}
      <aside className="w-1/3 bg-blue-200 dark:bg-blue-900 p-6 flex flex-col items-center justify-center space-y-6">
        <Menu
          onStart={async () => {
            setIsScriptRunning(true);
            await window.electron.invoke('start-puppeteer-scraper');
          }}
          onStop={async () => {
            setIsStopping(true);
            await window.electron.invoke('stop-puppeteer-scraper');
          }}
          onSettings={() => setView('settings')}
          isScriptRunning={isScriptRunning}
          isStopping={isStopping}
        />
      </aside>

      {/* Log panel: remaining 2/3 */}
      <main className="flex-1 bg-white dark:bg-gray-800 p-6 overflow-y-auto">
        <LogPanel notifyInApp={settings.notifyInApp} />
      </main>
    </div>
  );
}
