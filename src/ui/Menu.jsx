<<<<<<< HEAD
import React, { useEffect, useState } from 'react';

=======
// src/renderer/components/Menu.jsx
import React from 'react';
import React, { useEffect, useState } from 'react';


>>>>>>> 5fded0742bf6b188c54d9aba11c3520432a189da
export default function Menu({ onStart, onSettings }) {
  const [hasSettings, setHasSettings] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('scraperSettings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
<<<<<<< HEAD
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
=======
        if (parsed.refreshRate && parsed.notifications !== undefined) {
          setHasSettings(true);
>>>>>>> 5fded0742bf6b188c54d9aba11c3520432a189da
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
