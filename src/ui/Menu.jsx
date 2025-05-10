// src/renderer/components/Menu.jsx
import React from 'react';
import React, { useEffect, useState } from 'react';


export default function Menu({ onStart, onSettings }) {
  const [hasSettings, setHasSettings] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('scraperSettings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.refreshRate && parsed.notifications !== undefined) {
          setHasSettings(true);
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
        className="w-48 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow-lg transition"
      >
        Start Scraper
      </button>

      <button
        onClick={onSettings}
        className="w-48 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-lg transition"
      >
        Settings
      </button>
    </div>
  );
}
