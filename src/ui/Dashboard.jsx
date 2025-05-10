import React, { useState } from 'react';

export default function Dashboard() {
  // Scraper mode toggle
  const [headless, setHeadless] = useState(true);

  // Credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Refresh interval
  const [intervalSec, setIntervalSec] = useState(60);

  // Notification preferences
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyDiscord, setNotifyDiscord] = useState(false);

  // Auto-order settings
  const [autoOrder, setAutoOrder] = useState(false);
  const [minPrice, setMinPrice] = useState(20.0);

  const [settingsSaved, setSettingsSaved] = useState(false);

  const handleSaveSettings = () => {
    // TODO: Save settings logic here

    // Hide settings and show main buttons
    setSettingsSaved(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
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
      </section>

      {/* Login Credentials */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">
          Login Credentials
        </h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
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
            className="w-32 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
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

      {/* Auto-Order */}
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
            className="w-32 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </section>

      {/* Save Button */}
      <div className="text-center">
        <button
          onClick={handleSaveSettings}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}

