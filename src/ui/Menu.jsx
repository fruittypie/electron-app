import React, { useEffect, useState } from 'react';

export default function Menu({  onStart, onStop, onSettings, isScriptRunning, isStopping }) {
  const [hasSettings,    setHasSettings]    = useState(false);

  // Load saved settings and subscribe to "scraper-finished"
  useEffect(() => {
    (async () => {
      try {
        const settings = await window.electron.invoke('get-scraper-settings');
        setHasSettings(!!settings.username && !!settings.password);
      } catch (err) {
        console.error('Error loading settings:', err);
        setHasSettings(false);
      }
    })();
  }, []);

  const handleButtonClick = async () => {
    if (isScriptRunning) {
      // stop flow
      await onStop(); 
    } else {
      // start flow
      if (!hasSettings) {
        console.warn('Cannot start: settings missing');
        return;
      }
      await onStart();
    }
  };

  // derive the button label
  const buttonLabel = isStopping
    ? 'Stopping…'
    : isScriptRunning
      ? 'Stop Script'
      : 'Start Scraper';

 return (
  <div className="w-1/3 bg-blue-200 dark:bg-blue-900 p-6 flex flex-col items-center justify-center space-y-6">
    <button
      onClick={handleButtonClick}
      disabled={!hasSettings || isStopping}
      className={`w-32 py-3 font-semibold text-white rounded-full shadow transition ${
        !hasSettings || isStopping
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-green-600 hover:bg-green-700'
      }`}
    >
      {buttonLabel}
    </button>

    {/* Settings */}
    <button
      onClick={onSettings}
      className="w-32 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-full shadow transition"
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
