import React, { useState, useEffect } from 'react';

export default function Settings({ onBack }) {
  const [headless, setHeadless] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [intervalSec, setIntervalSec] = useState(60);
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyDiscord, setNotifyDiscord] = useState(false);
  const [autoOrder, setAutoOrder] = useState(false);
  const [minPrice, setMinPrice] = useState(20.0);
  const [validationErrors, setValidationErrors] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Use IPC to get settings from main process
        const storedSettings = await ipcRenderer.invoke('get-scraper-settings');
        // Update state with stored settings
        setHeadless(storedSettings.headless ?? true);
        setUsername(storedSettings.username ?? '');
        setPassword(storedSettings.password ?? '');
        setIntervalSec(storedSettings.intervalSec ?? 60);
        setNotifyInApp(storedSettings.notifyInApp ?? true);
        setNotifyDiscord(storedSettings.notifyDiscord ?? false);
        setAutoOrder(storedSettings.autoOrder ?? false);
        setMinPrice(storedSettings.minPrice ?? 20.0);
      } catch (error) {
        console.error('Failed to load settings:', error);
        setSaveError('Failed to load previous settings');
      }
    };

    loadSettings();
  }, []);

  const validateSettings = () => {
    const errors = {};

    if (!username.trim()) {
      errors.username = 'Username is required';
    }
    if (!password.trim()) {
      errors.password = 'Password is required';
    }
    if (intervalSec <= 5) {
      errors.intervalSec = 'Refresh interval must be greater than 5 seconds';
    }
    if (autoOrder && minPrice < 0) {
      errors.minPrice = 'Minimum price must be non-negative';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // save settings handler
  const handleSaveSettings = async () => {
    // clear previous errors
    setSaveError(null);

    // validate settings first
    if (!validateSettings()) {
      return;
    }

    // prepare settings object
    const settings = {
      headless,
      username,
      password,
      intervalSec,
      notifyInApp,
      notifyDiscord,
      autoOrder,
      minPrice
    };
    
    try {
      // use IPC to save settings via main process
      const result = await window.electron.invoke('save-scraper-settings', settings);
      
      if (result.success) {
        // show success message
        setSaveSuccess(true);
        setValidationErrors({});

        // clear success message after 3 seconds
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        // handle save failure
        setSaveError(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveError('An unexpected error occurred while saving settings');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Back Button */}
      <div className="mb-6">
        <button 
          onClick={onBack} 
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          ← Back to Menu
        </button>
      </div>

      {/* Scraper Mode */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <span className="text-gray-800 dark:text-gray-100 font-medium">Scraper Mode</span>
          <label className="relative inline-block w-12 h-6">
            <input
              type="checkbox"
              className="opacity-0 w-0 h-0"
              checked={headless}
              onChange={() => setHeadless(!headless)}
            />
            <span className="absolute inset-0 bg-gray-300 dark:bg-gray-600 rounded-full transition-colors"></span>
            <span
              className={`absolute top-0.5 left-0 bg-white w-5 h-5 rounded-full shadow transform transition-transform ${
                headless ? 'translate-x-6' : ''
              }`}
            ></span>
          </label>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {headless 
            ? "Run browser in background (recommended)" 
            : "Run browser with visible interface"}
        </p>
      </section>

      {/* Login Credentials */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">
          Login Credentials
        </h2>
        <div className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className={`w-full px-4 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:outline-none ${
                validationErrors.username 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-700 focus:ring-indigo-500'
              }`}
            />
            {validationErrors.username && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.username}</p>
            )}
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={`w-full px-4 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:outline-none ${
                validationErrors.password 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-700 focus:ring-indigo-500'
              }`}
            />
            {validationErrors.password && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>
            )}
          </div>
        </div>
      </section>

      {/* Interval & Notifications */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Refresh Interval (sec)
          </label>
          <input
            type="number"
            min="1"
            value={intervalSec}
            onChange={e => setIntervalSec(parseInt(e.target.value, 10))}
            className={`w-32 px-4 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:outline-none ${
              validationErrors.intervalSec 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 dark:border-gray-700 focus:ring-indigo-500'
            }`}
          />
          {validationErrors.intervalSec && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.intervalSec}</p>
          )}
        </div>
        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notifications
          </span>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={notifyInApp}
              onChange={() => setNotifyInApp(!notifyInApp)}
              className="h-4 w-4 text-indigo-600 rounded border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
            />
            <span className="text-gray-700 dark:text-gray-300">In-App</span>
          </label>
          <label className="flex items-center space-x-2 mt-2">
            <input
              type="checkbox"
              checked={notifyDiscord}
              onChange={() => setNotifyDiscord(!notifyDiscord)}
              className="h-4 w-4 text-indigo-600 rounded border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
            />
            <span className="text-gray-700 dark:text-gray-300">Discord</span>
          </label>
        </div>
      </section>

      {/* Auto Order */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-800 dark:text-gray-100 font-medium">Auto-Order</span>
          <label className="relative inline-block w-12 h-6">
            <input
              type="checkbox"
              className="opacity-0 w-0 h-0"
              checked={autoOrder}
              onChange={() => setAutoOrder(!autoOrder)}
            />
            <span className="absolute inset-0 bg-gray-300 dark:bg-gray-600 rounded-full transition-colors"></span>
            <span
              className={`absolute top-0.5 left-0 bg-white w-5 h-5 rounded-full shadow transform transition-transform ${
                autoOrder ? 'translate-x-6' : ''
              }`}
            ></span>
          </label>
        </div>
        {autoOrder && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Minimum Price ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={minPrice}
              onChange={e => setMinPrice(parseFloat(e.target.value))}
              className={`w-32 px-4 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:outline-none ${
                validationErrors.minPrice 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-700 focus:ring-indigo-500'
              }`}
            />
            {validationErrors.minPrice && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.minPrice}</p>
            )}
          </div>
        )}
      </section>

      {/* Save Button and Feedback */}
      <div className="text-center space-y-4">
        <button
          onClick={handleSaveSettings}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          Save Settings
        </button>
        
        {saveSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            Settings saved successfully!
          </div>
        )}
      </div>
    </div>
  );
}