import React, { useEffect, useState } from 'react';

export default function Menu({ onSettings }) {
  const [hasSettings, setHasSettings] = useState(false);
  const [settings, setSettings] = useState({});

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
  }, []);

  const handleStartScraper = async () => {
    if (!hasSettings) {
      console.log("Settings are missing.");
      return;
    }

    try {
      // Trigger Puppeteer script via IPC and pass necessary settings
      await window.electron.invoke('start-puppeteer-scraper', settings);
    } catch (error) {
      console.error('Error starting scraper:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center space-y-6 bg-gray-50 dark:bg-gray-900">
      <button
        onClick={handleStartScraper}
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