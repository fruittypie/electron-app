import React, { useEffect, useState } from 'react';

export default function Menu({ onSettings }) {
  const [hasSettings,    setHasSettings]    = useState(false);
  const [isScriptRunning, setIsScriptRunning] = useState(false);
  const [isStopping,      setIsStopping]      = useState(false);

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

    const onFinished = () => {
      // Reset both flags when scraper ends
      setIsStopping(false);
      setIsScriptRunning(false);
    };

    window.electron.on('scraper-finished', onFinished);
    return () => {
      window.electron.off('scraper-finished', onFinished);
    };
  }, []);

  const handleButtonClick = async () => {
    if (isScriptRunning) {
      // stop flow
      setIsStopping(true);
      setIsScriptRunning(false);
      try {
        await window.electron.invoke('stop-puppeteer-scraper');
        // renderer will reset flags when scraper-finished arrives
      } catch (err) {
        console.error('Error stopping scraper:', err);
        // fallback reset on error
        setIsStopping(false);
      }
    } else {
      // start flow
      if (!hasSettings) {
        console.warn('Cannot start: settings missing');
        return;
      }
      setIsStopping(false);
      setIsScriptRunning(true);
      try {
        await window.electron.invoke('start-puppeteer-scraper');
        // scraper-finished will fire later
      } catch (err) {
        console.error('Error starting scraper:', err);
        // fallback reset on error
        setIsScriptRunning(false);
      }
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
