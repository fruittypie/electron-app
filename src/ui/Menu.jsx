import React, { useEffect, useState } from 'react';

export default function Menu({ onStart, onSettings }) {
  const [hasSettings, setHasSettings] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('scraperSettings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (
          parsed.username && 
          parsed.password && 
          parsed.intervalSec && 
          parsed.intervalSec > 0 &&
          (parsed.notifyInApp || parsed.notifyDiscord)
        ) {
          setHasSettings(true);
        } else {
          setHasSettings(false);
        }
      } catch {
        // Invalid settings
        setHasSettings(false);
      }
    }
  }, []);

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
