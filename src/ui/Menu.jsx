import React, { useEffect, useState } from 'react';

export default function Menu({ onStart, onSettings }) {
  const [hasSettings, setHasSettings] = useState(false);

  useEffect(() => {
    // fetching the settings from the main process IPC
    const loadSettings = async () => {
      try {
        const storedSettings = await window.electron.invoke('get-scraper-settings');
        // check if necessary settings are available
        setHasSettings(!!storedSettings.username && !!storedSettings.password);
      } catch (error) {
        console.error('Error loading settings:', error);
        setHasSettings(false); // ensure we set to false in case of an error
      }
    };

    loadSettings();
  }, []); // empty dependency array to run only on mount

  return (
    <div className="h-screen flex flex-col items-center justify-center space-y-6 bg-gray-50 dark:bg-gray-900">
      <button
        onClick={onStart}
        disabled={!hasSettings}
        className={`w-48 py-3 font-semibold rounded-md shadow-lg transition ${
          hasSettings
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-gray-400 text-gray-200 cursor-not-allowed'
        }`}
      >
        Start Scraper
      </button>

      <button
        onClick={onSettings}
        className="w-48 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-lg transition"
      >
        Settings
      </button>

      {!hasSettings && (
        <p className="text-red-500 text-sm text-center">
          Please configure settings before starting the scraper
        </p>
      )}
    </div>
  );
}